<?php
/**
 * Plugin Name: Veículo Judicial – Núcleo
 * Description: Dados dos leilões (vitrine pública × base completa para assinantes), login dos assinantes, importação diária da coleta e configurações do site Veículo Judicial.
 * Version: 1.0.0
 * Author: DRLSYS
 * Text Domain: veiculo-judicial
 * Requires at least: 6.2
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) exit;

define('VJ_VERSAO', '1.0.0');
define('VJ_ROLE', 'vj_assinante');
define('VJ_CAP', 'vj_premium');

require_once __DIR__ . '/includes/dados.php';
require_once __DIR__ . '/includes/assinantes.php';
require_once __DIR__ . '/includes/rest.php';
require_once __DIR__ . '/includes/admin.php';

/* ---------- Ativação ---------- */
register_activation_hook(__FILE__, function () {
    // Papel do assinante: só lê o site; a capacidade vj_premium libera a base completa.
    add_role(VJ_ROLE, 'Assinante Veículo Judicial', ['read' => true, VJ_CAP => true]);
    $admin = get_role('administrator');
    if ($admin) $admin->add_cap(VJ_CAP);

    // Chave usada pela coleta diária (GitHub Actions) para enviar os dados.
    if (!get_option('vj_token')) add_option('vj_token', wp_generate_password(40, false, false));

    vj_preparar_pasta_dados();
});

/* ---------- Configurações (com padrões) ---------- */
function vj_config() {
    $padrao = [
        'whatsapp'          => '5511947581678',
        'nome_contato'      => 'Rubens',
        'preco_plano'       => 'R$ 49,90/mês',
        'checkout_url'      => '',   // link do checkout Hotmart/Kiwify (quando existir)
        'consultoria'       => 2700,
        'comissao_pct'      => 5,
        'oficial_justica'   => 115,
        'carta_arrematacao' => 80,
        'transferencia'     => 600,
        'instagram'         => 'rubensleilao',
    ];
    $salvo = get_option('vj_config', []);
    return wp_parse_args(is_array($salvo) ? $salvo : [], $padrao);
}

/* ---------- Assinante não entra no wp-admin nem vê a barra do WP ---------- */
add_action('admin_init', function () {
    if (wp_doing_ajax() || current_user_can('edit_posts')) return;
    if (is_user_logged_in()) {
        wp_safe_redirect(home_url('/'));
        exit;
    }
});
add_filter('show_admin_bar', function ($mostrar) {
    return current_user_can('edit_posts') ? $mostrar : false;
});
