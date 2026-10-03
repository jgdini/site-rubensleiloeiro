<?php
/**
 * Fila dos e-mails de acesso ("crie sua senha").
 *
 * O e-mail da Hostinger tem limite de envio por hora (erro 451 "hostinger_out_ratelimit"). Quando o envio
 * falha, o assinante entra numa fila e o WP-Cron tenta de novo a cada 10 minutos, poucos por vez.
 * Também é a fila do botão "Reenviar a todos" (Configurações → Veículo Judicial).
 */
if (!defined('ABSPATH')) exit;

const VJ_FILA_OPCAO = 'vj_fila_acesso';
const VJ_FILA_EVENTO = 'vj_fila_acesso_processar';
const VJ_FILA_POR_RODADA = 6;

add_filter('cron_schedules', function ($s) {
    $s['vj_10min'] = ['interval' => 10 * MINUTE_IN_SECONDS, 'display' => 'A cada 10 minutos (Veículo Judicial)'];
    return $s;
});

function vj_fila() {
    $f = get_option(VJ_FILA_OPCAO, []);
    return is_array($f) ? $f : [];
}

/** Põe um assinante na fila (sem duplicar) e garante o agendamento. */
function vj_fila_adicionar($user_id, $primeiro_acesso = true) {
    $f = vj_fila();
    $f[(int) $user_id] = ['primeiro' => (bool) $primeiro_acesso, 'desde' => current_time('mysql')];
    update_option(VJ_FILA_OPCAO, $f, false);
    if (!wp_next_scheduled(VJ_FILA_EVENTO)) wp_schedule_event(time() + 5 * MINUTE_IN_SECONDS, 'vj_10min', VJ_FILA_EVENTO);
}

/** Envia agora; se o servidor recusar (limite), deixa na fila para tentar depois. */
function vj_enviar_acesso($user, $primeiro_acesso = true) {
    $ok = vj_enviar_link_senha($user, $primeiro_acesso);
    if ($ok === true) {
        update_user_meta($user->ID, 'vj_acesso_enviado', current_time('mysql'));
        return true;
    }
    vj_fila_adicionar($user->ID, $primeiro_acesso);
    return false;
}

add_action(VJ_FILA_EVENTO, 'vj_fila_processar');
function vj_fila_processar() {
    $f = vj_fila();
    if (!$f) {
        wp_clear_scheduled_hook(VJ_FILA_EVENTO);
        return;
    }
    $n = 0;
    foreach ($f as $id => $item) {
        if ($n++ >= VJ_FILA_POR_RODADA) break;
        $user = get_user_by('id', $id);
        if (!$user) { unset($f[$id]); continue; }
        if (vj_enviar_link_senha($user, !empty($item['primeiro'])) === true) {
            update_user_meta($id, 'vj_acesso_enviado', current_time('mysql'));
            unset($f[$id]);
        } else {
            break; // limite de novo: para e tenta na próxima rodada
        }
    }
    update_option(VJ_FILA_OPCAO, $f, false);
}

// Guarda o último erro de envio para mostrar na tela de configurações.
add_action('wp_mail_failed', function ($erro) {
    update_option('vj_ultimo_erro_email', ['quando' => current_time('mysql'), 'msg' => wp_strip_all_tags($erro->get_error_message())], false);
});

/* ---------- Avisos automáticos do WordPress que só gastam o limite ---------- */
// "Novo usuário cadastrado" para o administrador.
add_filter('wp_send_new_user_notification_to_admin', '__return_false');
// "Sua senha foi alterada" para o assinante (ele acabou de trocar, no próprio site).
add_filter('send_password_change_email', function ($enviar, $user) {
    return user_can($user['ID'] ?? 0, 'edit_posts') ? $enviar : false;
}, 10, 2);
// "Usuário X trocou a senha" para o administrador.
if (!function_exists('wp_password_change_notification')) {
    function wp_password_change_notification($user) {}
}
