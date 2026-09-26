<?php
/**
 * Tela Configurações → Veículo Judicial: contato, plano, custos da operação,
 * status da coleta e chave da importação. Também permite ativar um assinante manualmente.
 */
if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_options_page('Veículo Judicial', 'Veículo Judicial', 'manage_options', 'veiculo-judicial', 'vj_tela_config');
});

add_action('admin_post_vj_salvar', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_salvar');
    $c = vj_config();
    foreach (['whatsapp', 'nome_contato', 'preco_plano', 'instagram'] as $k) {
        if (isset($_POST[$k])) $c[$k] = sanitize_text_field(wp_unslash($_POST[$k]));
    }
    $c['whatsapp'] = preg_replace('/\D+/', '', $c['whatsapp']);
    $c['checkout_url'] = isset($_POST['checkout_url']) ? esc_url_raw(wp_unslash($_POST['checkout_url'])) : '';
    foreach (['consultoria', 'comissao_pct', 'oficial_justica', 'carta_arrematacao', 'transferencia'] as $k) {
        if (isset($_POST[$k])) $c[$k] = (float) str_replace(',', '.', wp_unslash($_POST[$k]));
    }
    update_option('vj_config', $c);
    if (!empty($_POST['novo_token'])) update_option('vj_token', wp_generate_password(40, false, false));
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&salvo=1'));
    exit;
});

add_action('admin_post_vj_ativar_manual', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_ativar_manual');
    $r = vj_ativar_assinante(wp_unslash($_POST['email'] ?? ''), sanitize_text_field(wp_unslash($_POST['nome'] ?? '')), 'manual');
    $msg = is_wp_error($r) ? 'erro' : 'ativado';
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&' . $msg . '=1'));
    exit;
});

function vj_tela_config() {
    $c = vj_config();
    $r = vj_resumo_dados();
    $ult = get_option('vj_ultima_importacao');
    $campo = function ($nome, $rotulo, $tipo = 'text', $ajuda = '') use ($c) {
        printf(
            '<tr><th scope="row"><label for="%1$s">%2$s</label></th><td><input name="%1$s" id="%1$s" type="%3$s" value="%4$s" class="regular-text" step="any">%5$s</td></tr>',
            esc_attr($nome), esc_html($rotulo), esc_attr($tipo), esc_attr($c[$nome]), $ajuda ? '<p class="description">' . esc_html($ajuda) . '</p>' : ''
        );
    };
    ?>
    <div class="wrap">
      <h1>Veículo Judicial</h1>
      <?php if (!empty($_GET['salvo'])) echo '<div class="notice notice-success"><p>Configurações salvas.</p></div>'; ?>
      <?php if (!empty($_GET['ativado'])) echo '<div class="notice notice-success"><p>Assinante ativado. Se for novo, ele recebe um e-mail para criar a senha.</p></div>'; ?>
      <?php if (!empty($_GET['erro'])) echo '<div class="notice notice-error"><p>Não foi possível ativar: verifique o e-mail.</p></div>'; ?>

      <h2>Coleta diária</h2>
      <p>
        <?php if ($r): ?>
          <strong><?php echo esc_html(number_format_i18n($r['total'])); ?> veículos</strong>
          de <?php echo esc_html($r['leiloeiros'] ?: '—'); ?> leiloeiros ·
          coletado em <?php echo esc_html($r['gerado_em'] ? wp_date('d/m/Y H:i', strtotime($r['gerado_em'])) : '—'); ?> ·
          recebido em <?php echo esc_html($ult ? mysql2date('d/m/Y H:i', $ult) : '—'); ?>
        <?php else: ?>
          <em>Nenhum dado recebido ainda.</em>
        <?php endif; ?>
      </p>
      <p>Endereço de importação: <code><?php echo esc_html(rest_url('vj/v1/importar')); ?></code><br>
         Chave (cabeçalho <code>X-VJ-Token</code>): <code><?php echo esc_html(get_option('vj_token')); ?></code></p>

      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="vj_salvar">
        <?php wp_nonce_field('vj_salvar'); ?>
        <h2>Contato e plano</h2>
        <table class="form-table" role="presentation">
          <?php
          $campo('whatsapp', 'WhatsApp (DDI+DDD+número)', 'text', 'Ex.: 5511947581678');
          $campo('nome_contato', 'Nome no WhatsApp');
          $campo('instagram', 'Instagram (sem @)');
          $campo('preco_plano', 'Preço exibido do plano', 'text', 'Ex.: R$ 49,90/mês');
          $campo('checkout_url', 'Link do checkout (Hotmart/Kiwify)', 'url', 'Enquanto vazio, o botão "Assinar" abre o WhatsApp.');
          ?>
        </table>
        <h2>Custos da operação (calculadora)</h2>
        <table class="form-table" role="presentation">
          <?php
          $campo('consultoria', 'Consultoria (R$)', 'number');
          $campo('comissao_pct', 'Comissão padrão do leiloeiro (%)', 'number', 'Usada quando o edital não informa a comissão.');
          $campo('oficial_justica', 'Condução do oficial de justiça (R$)', 'number');
          $campo('carta_arrematacao', 'Expedição da carta de arrematação (R$)', 'number');
          $campo('transferencia', 'Transferência do veículo (R$, aprox.)', 'number');
          ?>
        </table>
        <p><label><input type="checkbox" name="novo_token" value="1"> Gerar nova chave de importação (atualize também o segredo no GitHub)</label></p>
        <?php submit_button('Salvar'); ?>
      </form>

      <h2>Ativar assinante manualmente</h2>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="vj_ativar_manual">
        <?php wp_nonce_field('vj_ativar_manual'); ?>
        <input type="email" name="email" placeholder="e-mail do cliente" required class="regular-text">
        <input type="text" name="nome" placeholder="nome (opcional)" class="regular-text">
        <?php submit_button('Ativar', 'secondary', 'submit', false); ?>
      </form>
    </div>
    <?php
}
