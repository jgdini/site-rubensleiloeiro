<?php
/**
 * Importação automática: duas vezes por dia o WordPress busca a coleta publicada no GitHub
 * (o GitHub Actions coleta às 06:00 de Brasília). Não depende de chave nem de segredo no GitHub.
 * O WP-Cron roda quando alguém visita o site; com tráfego normal isso basta.
 */
if (!defined('ABSPATH')) exit;

define('VJ_EVENTO_IMPORTACAO', 'vj_importacao_diaria');

// Agenda na primeira carga (atualizar o plugin por upload não dispara o hook de ativação).
add_action('init', function () {
    if (!wp_next_scheduled(VJ_EVENTO_IMPORTACAO)) {
        // Próximas 10:00 UTC (07:00 em Brasília), depois a cada 12h.
        $alvo = strtotime('today 10:00 UTC');
        if ($alvo <= time()) $alvo = strtotime('tomorrow 10:00 UTC');
        wp_schedule_event($alvo, 'twicedaily', VJ_EVENTO_IMPORTACAO);
    }
});

add_action(VJ_EVENTO_IMPORTACAO, function () {
    $url = get_option('vj_fonte_url') ?: vj_url_fonte_padrao();
    $base = trailingslashit($url);

    // Só importa se a coleta publicada for mais nova que a atual.
    $r = wp_remote_get($base . 'vitrine.json?nocache=' . time(), ['timeout' => 60]);
    if (is_wp_error($r) || wp_remote_retrieve_response_code($r) !== 200) return;
    $nova = json_decode(wp_remote_retrieve_body($r), true);
    $atual = vj_resumo_dados();
    // Só importa se for mais nova: a Web App da Hostinger também publica, e o GitHub pode ter dados mais antigos.
    if (empty($nova['geradoEm']) || ($atual && $atual['gerado_em'] && strtotime($nova['geradoEm']) <= strtotime($atual['gerado_em']))) return;

    $res = vj_importar_de_url($base);
    update_option('vj_importacao_auto', [
        'quando' => current_time('mysql'),
        'resultado' => is_wp_error($res) ? 'erro: ' . $res->get_error_message() : $res . ' veículos',
    ], false);
});

register_deactivation_hook(dirname(__DIR__) . '/veiculo-judicial-core.php', function () {
    wp_clear_scheduled_hook(VJ_EVENTO_IMPORTACAO);
});
