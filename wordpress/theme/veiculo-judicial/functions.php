<?php
/**
 * Tema Veículo Judicial.
 * A lógica de dados/assinantes fica no plugin "Veículo Judicial – Núcleo"; o tema só apresenta.
 */
if (!defined('ABSPATH')) exit;

define('VJ_TEMA_VERSAO', '1.1.6');
define('VJ_MARCA', 'Veículo Judicial');

require_once __DIR__ . '/inc/seo.php';

function vj_asset($caminho) {
    return get_theme_file_uri('assets/' . ltrim($caminho, '/'));
}

/** Configurações do plugin (com padrões, caso o plugin ainda não esteja ativo). */
function vj_tema_config() {
    if (function_exists('vj_config')) return vj_config();
    return [
        'whatsapp' => '5511947581678', 'nome_contato' => 'Rubens', 'preco_plano' => 'R$ 49,90/mês', 'checkout_url' => '',
        'consultoria' => 2700, 'comissao_pct' => 5, 'oficial_justica' => 115, 'carta_arrematacao' => 80, 'transferencia' => 600,
        'instagram' => 'rubensleilao',
    ];
}

/** URL da página "Quem é o Rubens" (slug quem-e-o-rubens). */
function vj_url_rubens() {
    $p = get_page_by_path('quem-e-o-rubens');
    return $p ? get_permalink($p) : home_url('/quem-e-o-rubens/');
}

function vj_eh_pagina_rubens() {
    return is_page_template('page-rubens.php') || is_page('quem-e-o-rubens');
}

/** Ao ativar o tema: cria a página "Quem é o Rubens" (se ainda não existir) já com o modelo certo. */
add_action('after_switch_theme', function () {
    if (!get_page_by_path('quem-e-o-rubens')) {
        $id = wp_insert_post([
            'post_type'   => 'page',
            'post_status' => 'publish',
            'post_title'  => 'Quem é o Rubens',
            'post_name'   => 'quem-e-o-rubens',
        ]);
        if ($id && !is_wp_error($id)) update_post_meta($id, '_wp_page_template', 'page-rubens.php');
    }
    flush_rewrite_rules();
});

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
});

// Título, descrição, canonical e dados estruturados: inc/seo.php.

add_action('wp_head', function () {
    // Fotos dos lotes vêm dos servidores dos leiloeiros: sem Referer evita bloqueio de hotlink.
    echo '<meta name="referrer" content="no-referrer" />' . "\n";
    echo '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%278%27 fill=%27%23c9a44c%27/%3E%3Cpath d=%27M8 20h16l-2-6H10z%27 fill=%27%230b1830%27/%3E%3Ccircle cx=%2711%27 cy=%2721%27 r=%272.5%27 fill=%27%230b1830%27/%3E%3Ccircle cx=%2721%27 cy=%2721%27 r=%272.5%27 fill=%27%230b1830%27/%3E%3C/svg%3E" />' . "\n";
}, 1);

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('vj-fontes', 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&family=Instrument+Serif:ital@0;1&display=swap', [], null);
    wp_enqueue_style('vj-estilo', vj_asset('style.css'), ['vj-fontes'], VJ_TEMA_VERSAO);
    wp_enqueue_style('vj-tema', get_stylesheet_uri(), ['vj-estilo'], VJ_TEMA_VERSAO);
    // Aviso "não somos leiloeiros / não nos responsabilizamos pelos anúncios" na primeira visita, em todas as páginas.
    wp_enqueue_script('vj-aviso', vj_asset('aviso.js'), [], VJ_TEMA_VERSAO, ['in_footer' => true, 'strategy' => 'defer']);

    if (vj_eh_pagina_rubens()) {
        wp_enqueue_style('vj-rubens', vj_asset('rubens.css'), ['vj-estilo'], VJ_TEMA_VERSAO);
    }

    if (is_front_page()) {
        wp_enqueue_script('vj-app', vj_asset('app.js'), [], VJ_TEMA_VERSAO, ['in_footer' => true, 'strategy' => 'defer']);
        // JSON (não wp_localize_script) para manter números e booleanos com o tipo certo.
        wp_add_inline_script('vj-app', 'window.VJ = ' . wp_json_encode(vj_dados_js()) . ';', 'before');
    }
});

/** Dados que o app.js recebe em window.VJ. */
function vj_dados_js() {
    $c = vj_tema_config();
    $u = wp_get_current_user();
    return [
        'marca'       => VJ_MARCA,
        'whatsapp'    => (string) $c['whatsapp'],
        'nomeContato' => (string) $c['nome_contato'],
        'precoPlano'  => (string) $c['preco_plano'],
        'checkoutUrl' => (string) $c['checkout_url'],
        'custos'      => [
            'consultoria'       => (float) $c['consultoria'],
            'comissaoPct'       => (float) $c['comissao_pct'],
            'oficialJustica'    => (float) $c['oficial_justica'],
            'cartaArrematacao'  => (float) $c['carta_arrematacao'],
            'transferencia'     => (float) $c['transferencia'],
        ],
        'vitrineUrl'  => rest_url('vj/v1/vitrine'),
        'lotesUrl'    => rest_url('vj/v1/lotes'),
        'loginUrl'    => rest_url('vj/v1/login'),
        'logoutUrl'   => wp_logout_url(home_url('/')),
        'esqueciUrl'  => wp_lostpassword_url(home_url('/')),
        'nonce'       => wp_create_nonce('wp_rest'),
        'logado'      => is_user_logged_in(),
        'usuario'     => $u->exists() ? $u->display_name : '',
        'assinante'   => current_user_can('vj_premium'),
    ];
}

/** Link do WhatsApp com mensagem (páginas institucionais). */
function vj_link_whats($texto) {
    $c = vj_tema_config();
    return 'https://wa.me/' . rawurlencode(preg_replace('/\D+/', '', $c['whatsapp'])) . '?text=' . rawurlencode($texto);
}
