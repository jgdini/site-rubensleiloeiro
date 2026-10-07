<?php
/**
 * Coleta na Hostinger (Web App Node.js): o WordPress dispara a coleta todo dia às 6h (Brasília)
 * e no botão "Coletar agora". A Web App coleta e devolve os dados em POST /vj/v1/importar.
 * A chave é a mesma da importação (vj_token), enviada no cabeçalho X-VJ-Token.
 */
if (!defined('ABSPATH')) exit;

const VJ_COLETA_EVENTO = 'vj_coleta_remota';

function vj_coleta_url() {
    return untrailingslashit(get_option('vj_coleta_url', 'https://snow-penguin-860273.hostingersite.com'));
}

function vj_coleta_disparar($origem) {
    $r = wp_remote_post(vj_coleta_url() . '/coletar?origem=' . rawurlencode($origem), [
        'timeout' => 20,
        'headers' => ['X-VJ-Token' => (string) get_option('vj_token')],
    ]);
    $res = is_wp_error($r) ? 'erro: ' . $r->get_error_message() : wp_remote_retrieve_response_code($r) . ' ' . wp_remote_retrieve_body($r);
    update_option('vj_coleta_disparo', ['quando' => current_time('mysql'), 'origem' => $origem, 'resposta' => mb_substr(wp_strip_all_tags($res), 0, 300)], false);
    return !is_wp_error($r) && wp_remote_retrieve_response_code($r) === 202;
}

function vj_coleta_status() {
    $r = wp_remote_get(vj_coleta_url() . '/', ['timeout' => 10]);
    if (is_wp_error($r)) return null;
    $j = json_decode(wp_remote_retrieve_body($r), true);
    return is_array($j) ? $j : null;
}

// Todo dia às 06:00 de Brasília (09:00 UTC).
add_action('init', function () {
    if (!wp_next_scheduled(VJ_COLETA_EVENTO)) {
        $alvo = strtotime('today 09:00 UTC');
        if ($alvo <= time()) $alvo = strtotime('tomorrow 09:00 UTC');
        wp_schedule_event($alvo, 'daily', VJ_COLETA_EVENTO);
    }
});
add_action(VJ_COLETA_EVENTO, function () { vj_coleta_disparar('agendada'); });

add_action('admin_post_vj_coletar_agora', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_coletar_agora');
    $ok = vj_coleta_disparar('botão');
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&coleta=' . ($ok ? 'ok' : 'erro')));
    exit;
});

/** Bloco mostrado em Configurações → Veículo Judicial. */
function vj_coleta_bloco_admin() {
    $st = vj_coleta_status();
    $d = get_option('vj_coleta_disparo');
    $u = $st['ultima'] ?? [];
    if (!empty($_GET['coleta'])) {
        echo $_GET['coleta'] === 'ok'
            ? '<div class="notice notice-success"><p>Coleta iniciada na Hostinger. Leva uns 7 minutos; depois os veículos atualizam sozinhos.</p></div>'
            : '<div class="notice notice-error"><p>Não foi possível iniciar a coleta: ' . esc_html($d['resposta'] ?? '') . '</p></div>';
    }
    echo '<p><b>Coleta na Hostinger</b> (' . esc_html(vj_coleta_url()) . '): ';
    if (!$st) echo '<span style="color:#b32d2e">serviço não respondeu</span>';
    elseif (!empty($st['rodando'])) echo 'coletando agora…';
    elseif (!empty($u['fim'])) echo 'última coleta ' . esc_html(wp_date('d/m/Y H:i', strtotime($u['fim']))) . ' — ' . (!empty($u['ok']) ? 'ok' : 'com falha') . (!empty($u['publicado']) ? ' · ' . esc_html(mb_strimwidth($u['publicado'], 0, 120, '…')) : '');
    else echo 'ainda não coletou';
    $prox = wp_next_scheduled(VJ_COLETA_EVENTO);
    echo $prox ? ' · próxima automática ' . esc_html(wp_date('d/m/Y H:i', $prox)) : '';
    echo '</p>';
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="margin:0 0 16px">'
        . '<input type="hidden" name="action" value="vj_coletar_agora">' . wp_nonce_field('vj_coletar_agora', '_wpnonce', true, false)
        . '<button class="button button-primary"' . (!empty($st['rodando']) ? ' disabled' : '') . '>Coletar agora</button></form>';
}
