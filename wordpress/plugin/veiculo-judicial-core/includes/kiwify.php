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
const VJ_KIWIFY_DESATIVA = ['order_refunded', 'chargeback', 'subscription_canceled'];

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

    if ($ativa) {
        $r = vj_ativar_assinante($email, $nome, 'kiwify');
        $txt = is_wp_error($r) ? 'erro: ' . $r->get_error_message() : 'ativado';
    } elseif ($desativa) {
        $txt = vj_desativar_assinante($email, 'kiwify: ' . ($evento ?: $status)) ? 'desativado' : 'desativar: usuário não existe';
    } else {
        $txt = 'sem ação'; // pix/boleto gerado, compra recusada, assinatura atrasada…
    }
    vj_kiwify_log($evento ?: $status, $email, $txt);
    return new WP_REST_Response(['ok' => true, 'acao' => $txt], 200);
}

/** Guarda as últimas 30 chamadas para conferência na tela de configurações. */
function vj_kiwify_log($evento, $email, $resultado) {
    $log = get_option('vj_kiwify_log', []);
    if (!is_array($log)) $log = [];
    array_unshift($log, ['quando' => current_time('mysql'), 'evento' => $evento, 'email' => $email, 'resultado' => $resultado]);
    update_option('vj_kiwify_log', array_slice($log, 0, 30), false);
}
