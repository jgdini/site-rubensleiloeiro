<?php
/**
 * Integração Kiwify: compra aprovada → cria/ativa o assinante; reembolso, chargeback ou
 * assinatura cancelada → tira o acesso.
 *
 * Na Kiwify (Apps → Webhooks) cadastre a URL mostrada em Configurações → Veículo Judicial
 * e cole aqui o token que a Kiwify gerar. Cada chamada vem com ?signature= (HMAC-SHA1 do
 * corpo com esse token); sem token configurado ou com assinatura errada, nada é feito.
 */
if (!defined('ABSPATH')) exit;

const VJ_KIWIFY_ATIVA = ['order_approved', 'subscription_renewed'];
// Reembolso e chargeback tiram o acesso na hora. Assinatura cancelada mantém o acesso até o fim do período pago.
const VJ_KIWIFY_DESATIVA = ['order_refunded', 'chargeback'];

function vj_kiwify_url() {
    return add_query_arg('rest_route', '/vj/v1/kiwify', home_url('/'));
}

add_action('rest_api_init', function () {
    register_rest_route('vj/v1', '/kiwify', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // a autenticação é a assinatura HMAC, conferida no callback
        'callback'            => 'vj_kiwify_webhook',
    ]);
});

function vj_kiwify_webhook(WP_REST_Request $req) {
    $token = (string) get_option('vj_kiwify_token');
    if ($token === '') {
        return new WP_REST_Response(['ok' => false, 'erro' => 'token da Kiwify não configurado'], 503);
    }
    $corpo = $req->get_body();
    $assinatura = (string) $req->get_param('signature');
    if ($assinatura === '' || !hash_equals(hash_hmac('sha1', $corpo, $token), strtolower($assinatura))) {
        vj_kiwify_log('?', '', 'assinatura inválida');
        return new WP_REST_Response(['ok' => false, 'erro' => 'assinatura inválida'], 401);
    }

    $d = json_decode($corpo, true);
    if (!is_array($d)) return new WP_REST_Response(['ok' => false, 'erro' => 'JSON inválido'], 400);

    $evento = (string) ($d['webhook_event_type'] ?? '');
    $status = (string) ($d['order_status'] ?? '');
    $cliente = $d['Customer'] ?? [];
    $email = sanitize_email($cliente['email'] ?? '');
    $nome = sanitize_text_field($cliente['full_name'] ?? ($cliente['first_name'] ?? ''));

    // Se houver produto configurado, ignora vendas de outros produtos da mesma conta.
    $produto = trim((string) get_option('vj_kiwify_produto'));
    $produto_venda = (string) ($d['Product']['product_id'] ?? '');
    if ($produto !== '' && $produto_venda !== '' && $produto_venda !== $produto) {
        vj_kiwify_log($evento ?: $status, $email, 'ignorado (outro produto)');
        return new WP_REST_Response(['ok' => true, 'acao' => 'ignorado'], 200);
    }

    if (!is_email($email)) {
        vj_kiwify_log($evento ?: $status, '', 'sem e-mail do cliente');
        return new WP_REST_Response(['ok' => false, 'erro' => 'sem e-mail'], 400);
    }

    $desativa = in_array($evento, VJ_KIWIFY_DESATIVA, true) || in_array($status, ['refunded', 'chargedback'], true);
    $ativa = !$desativa && (in_array($evento, VJ_KIWIFY_ATIVA, true) || $status === 'paid');

    if ($evento === 'subscription_canceled' && !$desativa) {
        $txt = vj_cancelar_assinatura($email, $d);
    } elseif ($ativa) {
        $r = vj_ativar_assinante($email, $nome, 'kiwify');
        if (!is_wp_error($r)) delete_user_meta($r, 'vj_acesso_ate'); // renovou: volta a ser assinatura normal
        $txt = is_wp_error($r) ? 'erro: ' . $r->get_error_message() : 'ativado';
    } elseif ($desativa) {
        $txt = vj_desativar_assinante($email, 'kiwify: ' . ($evento ?: $status)) ? 'desativado' : 'desativar: usuário não existe';
    } else {
        $txt = 'sem ação'; // pix/boleto gerado, compra recusada, assinatura atrasada…
    }
    vj_kiwify_log($evento ?: $status, $email, $txt);
    return new WP_REST_Response(['ok' => true, 'acao' => $txt], 200);
}

/**
 * Assinatura cancelada: o assinante continua com acesso até o fim do período já pago
 * (próxima cobrança informada pela Kiwify; se não vier, 1 mês depois da última ativação/renovação).
 * O bloqueio acontece sozinho em vj_expirar_acessos (de hora em hora).
 */
function vj_cancelar_assinatura($email, $d) {
    $user = get_user_by('email', $email);
    if (!$user) return 'cancelar: usuário não existe';
    $agora = current_time('timestamp');
    $fim = 0;
    $prox = $d['Subscription']['next_payment'] ?? ($d['Subscription']['next_charge'] ?? '');
    if ($prox) $fim = strtotime($prox);
    if ($fim <= $agora) {
        $ultima = get_user_meta($user->ID, 'vj_ativado_em', true);
        if ($ultima) $fim = strtotime('+1 month', strtotime($ultima));
    }
    if ($fim <= $agora) {
        vj_desativar_assinante($email, 'kiwify: assinatura cancelada');
        return 'desativado (período pago já terminou)';
    }
    $ate = wp_date('Y-m-d H:i:s', $fim);
    update_user_meta($user->ID, 'vj_acesso_ate', $ate);
    update_user_meta($user->ID, 'vj_status', 'cancelado');
    return 'cancelado — acesso até ' . wp_date('d/m/Y', $fim);
}

add_action('init', function () {
    if (!wp_next_scheduled('vj_expirar_acessos')) wp_schedule_event(time() + 300, 'hourly', 'vj_expirar_acessos');
});
add_action('vj_expirar_acessos', function () {
    $vencidos = get_users([
        'meta_query' => [['key' => 'vj_acesso_ate', 'value' => current_time('mysql'), 'compare' => '<=', 'type' => 'DATETIME']],
        'number' => 200,
    ]);
    foreach ($vencidos as $u) {
        vj_desativar_assinante($u->user_email, 'fim do período pago (assinatura cancelada)');
        delete_user_meta($u->ID, 'vj_acesso_ate');
        vj_kiwify_log('fim do período', $u->user_email, 'acesso bloqueado');
    }
});

/** Guarda as últimas 30 chamadas para conferência na tela de configurações. */
function vj_kiwify_log($evento, $email, $resultado) {
    $log = get_option('vj_kiwify_log', []);
    if (!is_array($log)) $log = [];
    array_unshift($log, ['quando' => current_time('mysql'), 'evento' => $evento, 'email' => $email, 'resultado' => $resultado]);
    update_option('vj_kiwify_log', array_slice($log, 0, 200), false);
}
