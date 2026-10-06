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
    // Preço, link do checkout e WhatsApp vão no HTML das páginas: sem limpar o cache do LiteSpeed, o site segue com os valores antigos.
    do_action('litespeed_purge_all');
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&salvo=1'));
    exit;
});

/** Endereço público de onde puxar a coleta (o GitHub Actions publica data/*.json no repositório). */
function vj_url_fonte_padrao() {
    return 'https://raw.githubusercontent.com/jgdini/site-rubensleiloeiro/main/data/';
}

/** Puxa lotes.json e vitrine.json de uma URL base e grava. Retorna total ou WP_Error. */
function vj_importar_de_url($base) {
    $base = trailingslashit($base);
    $conteudo = [];
    foreach (['lotes', 'vitrine'] as $nome) {
        $r = wp_remote_get($base . $nome . '.json?nocache=' . time(), ['timeout' => 60]);
        if (is_wp_error($r)) return $r;
        if (wp_remote_retrieve_response_code($r) !== 200) return new WP_Error('vj_http', "HTTP " . wp_remote_retrieve_response_code($r) . " em $nome.json");
        $corpo = wp_remote_retrieve_body($r);
        $j = json_decode($corpo, true);
        if (empty($j['lotes'])) return new WP_Error('vj_formato', "$nome.json sem lotes");
        $conteudo[$nome] = $corpo;
    }
    if (!vj_gravar('lotes', $conteudo['lotes']) || !vj_gravar('vitrine', $conteudo['vitrine'])) {
        return new WP_Error('vj_gravar', 'Não foi possível gravar os arquivos.');
    }
    vj_apos_importar();
    return count(json_decode($conteudo['lotes'], true)['lotes']);
}

add_action('admin_post_vj_importar_agora', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_importar_agora');
    $url = esc_url_raw(wp_unslash($_POST['fonte'] ?? '')) ?: vj_url_fonte_padrao();
    update_option('vj_fonte_url', $url, false);
    $r = vj_importar_de_url($url);
    $q = is_wp_error($r) ? 'importerro=' . rawurlencode($r->get_error_message()) : 'importado=' . (int) $r;
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&' . $q));
    exit;
});

add_action('admin_post_vj_kiwify', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_kiwify');
    $token = trim((string) wp_unslash($_POST['kiwify_token'] ?? ''));
    if ($token !== '') update_option('vj_kiwify_token', sanitize_text_field($token), false);
    update_option('vj_kiwify_produto', sanitize_text_field(wp_unslash($_POST['kiwify_produto'] ?? '')), false);
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&kiwify=1'));
    exit;
});

/* ---------- Tela Usuários: "Reenviar acesso" na linha e em massa ---------- */
add_filter('user_row_actions', function ($acoes, $user) {
    if (current_user_can('manage_options') && in_array(VJ_ROLE, (array) $user->roles, true)) {
        $url = wp_nonce_url(admin_url('admin-post.php?action=vj_reenviar_link&alvo=' . $user->ID), 'vj_reenviar');
        $acoes['vj_reenviar'] = '<a href="' . esc_url($url) . '">Reenviar acesso</a>';
    }
    return $acoes;
}, 10, 2);
add_action('admin_post_vj_reenviar_link', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_reenviar');
    $user = get_user_by('id', (int) ($_GET['alvo'] ?? 0));
    if (!$user) wp_die('Assinante não encontrado.');
    $r = vj_enviar_acesso($user, !get_user_meta($user->ID, 'vj_senha_criada', true)) ? 'um' : 'fila';
    wp_safe_redirect(add_query_arg('vj_reenvio', $r, wp_get_referer() ?: admin_url('users.php')));
    exit;
});
add_filter('bulk_actions-users', function ($acoes) {
    $acoes['vj_reenviar'] = 'Reenviar acesso (Veículo Judicial)';
    return $acoes;
});
add_filter('handle_bulk_actions-users', function ($volta, $acao, $ids) {
    if ($acao !== 'vj_reenviar' || !current_user_can('manage_options')) return $volta;
    foreach ($ids as $id) vj_fila_adicionar($id, !get_user_meta($id, 'vj_senha_criada', true));
    vj_fila_processar();
    return add_query_arg('vj_reenvio', 'todos', $volta);
}, 10, 3);
add_action('admin_notices', function () {
    if (empty($_GET['vj_reenvio']) || get_current_screen()->id !== 'users') return;
    $msg = ['um' => 'Link de acesso enviado.', 'fila' => 'O e-mail está no limite de envios; o link entrou na fila e sai sozinho em alguns minutos.', 'todos' => 'Envio iniciado: os e-mails saem aos poucos (alguns a cada 10 minutos).'][$_GET['vj_reenvio']] ?? '';
    if ($msg) echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($msg) . '</p></div>';
});

add_action('admin_post_vj_reenviar', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_reenviar');
    $alvo = sanitize_text_field(wp_unslash($_POST['alvo'] ?? ''));
    if ($alvo === 'todos') {
        foreach (get_users(['role' => VJ_ROLE, 'fields' => 'ID', 'number' => 500]) as $id) {
            vj_fila_adicionar($id, !get_user_meta($id, 'vj_senha_criada', true));
        }
        vj_fila_processar(); // primeira leva já sai agora
        $r = 'todos';
    } else {
        $user = get_user_by('id', (int) $alvo);
        if (!$user) wp_die('Assinante não encontrado.');
        $r = vj_enviar_acesso($user, !get_user_meta($user->ID, 'vj_senha_criada', true)) ? 'um' : 'fila';
    }
    wp_safe_redirect(admin_url('options-general.php?page=veiculo-judicial&reenvio=' . $r));
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
      <?php
      $auto = get_option('vj_importacao_auto');
      $prox = wp_next_scheduled('vj_importacao_diaria');
      echo '<p class="description">Importação automática (2× por dia): ' .
          ($auto ? 'última em ' . esc_html(mysql2date('d/m/Y H:i', $auto['quando'])) . ' — ' . esc_html($auto['resultado']) : 'ainda não rodou') .
          ($prox ? ' · próxima em ' . esc_html(wp_date('d/m/Y H:i', $prox)) : '') . '</p>';
      ?>
      <?php if (isset($_GET['importado'])) echo '<div class="notice notice-success"><p>Importação concluída: ' . esc_html(number_format_i18n((int) $_GET['importado'])) . ' veículos.</p></div>'; ?>
      <?php if (isset($_GET['importerro'])) echo '<div class="notice notice-error"><p>Falha na importação: ' . esc_html(wp_unslash($_GET['importerro'])) . '</p></div>'; ?>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:12px 0 20px">
        <input type="hidden" name="action" value="vj_importar_agora">
        <?php wp_nonce_field('vj_importar_agora'); ?>
        <input type="url" name="fonte" class="large-text" value="<?php echo esc_attr(get_option('vj_fonte_url', vj_url_fonte_padrao())); ?>">
        <p class="description">Busca agora os arquivos lotes.json e vitrine.json da coleta publicada nesse endereço.</p>
        <?php submit_button('Importar agora', 'primary', 'submit', false); ?>
      </form>
      <p>Envio automático pela coleta diária — endereço: <code><?php echo esc_html(rest_url('vj/v1/importar')); ?></code><br>
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

      <h2>Kiwify (pagamento → acesso)</h2>
      <?php if (!empty($_GET['kiwify'])) echo '<div class="notice notice-success"><p>Integração Kiwify salva.</p></div>'; ?>
      <p>Na Kiwify, em <b>Apps → Webhooks → Criar webhook</b>: cole a URL abaixo, escolha o produto e marque os eventos
         <i>Compra aprovada, Compra reembolsada, Chargeback, Assinatura cancelada</i> e <i>Assinatura renovada</i>. Depois cole aqui o token que a Kiwify mostrar.</p>
      <p>URL do webhook: <code><?php echo esc_html(vj_kiwify_url()); ?></code></p>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="vj_kiwify">
        <?php wp_nonce_field('vj_kiwify'); ?>
        <table class="form-table" role="presentation">
          <tr><th scope="row"><label for="kiwify_token">Token do webhook</label></th>
              <td><input name="kiwify_token" id="kiwify_token" type="password" class="regular-text" autocomplete="off"
                         placeholder="<?php echo get_option('vj_kiwify_token') ? '•••••• configurado (deixe vazio para manter)' : 'cole o token da Kiwify'; ?>"></td></tr>
          <tr><th scope="row"><label for="kiwify_produto">ID do produto (opcional)</label></th>
              <td><input name="kiwify_produto" id="kiwify_produto" type="text" class="regular-text" value="<?php echo esc_attr(get_option('vj_kiwify_produto', '')); ?>">
                  <p class="description">Se preenchido, vendas de outros produtos da conta são ignoradas.</p></td></tr>
        </table>
        <?php submit_button('Salvar Kiwify', 'secondary'); ?>
      </form>
      <?php $log = get_option('vj_kiwify_log', []); if ($log) : ?>
        <div style="max-width:900px;max-height:340px;overflow:auto;border:1px solid #c3c4c7">
        <table class="widefat striped" style="border:0"><thead><tr><th>Quando</th><th>Evento</th><th>E-mail</th><th>Resultado</th></tr></thead><tbody>
        <?php foreach (array_slice($log, 0, 200) as $l) printf('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>', esc_html(mysql2date('d/m/Y H:i', $l['quando'])), esc_html($l['evento']), esc_html($l['email']), esc_html($l['resultado'])); ?>
        </tbody></table></div>
        <p class="description"><?php echo count($log); ?> eventos registrados (os mais recentes primeiro).</p>
      <?php endif; ?>

      <h2>Acesso dos assinantes</h2>
      <?php
      if (isset($_GET['reenvio'])) {
          $msg = ['um' => 'Link enviado.', 'fila' => 'Link na fila: o servidor de e-mail está no limite de envios; o site tenta de novo sozinho a cada 10 minutos.', 'todos' => 'Envio para todos iniciado. Os e-mails saem aos poucos (alguns a cada 10 minutos) para não estourar o limite da Hostinger.'][$_GET['reenvio']] ?? '';
          if ($msg) echo '<div class="notice notice-success"><p>' . esc_html($msg) . '</p></div>';
      }
      $fila = vj_fila();
      $erro = get_option('vj_ultimo_erro_email');
      $assinantes = get_users(['role' => VJ_ROLE, 'orderby' => 'registered', 'order' => 'DESC', 'number' => 500]);
      ?>
      <p>Cada assinante recebe um e-mail com o link para criar a senha no próprio site (vale 24 horas). Se o e-mail da Hostinger estiver no limite, o envio entra na fila e sai sozinho depois.
         <?php echo $fila ? '<br><b>Na fila agora: ' . count($fila) . '</b>.' : ''; ?>
         <?php if ($erro) echo '<br><span style="color:#b32d2e">Último erro de e-mail (' . esc_html(mysql2date('d/m H:i', $erro['quando'])) . '): ' . esc_html(mb_strimwidth($erro['msg'], 0, 160, '…')) . '</span>'; ?></p>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-bottom:10px" onsubmit="return confirm('Enviar o e-mail de acesso para todos os assinantes? Quem já tem senha pode ignorar o e-mail.');">
        <input type="hidden" name="action" value="vj_reenviar">
        <input type="hidden" name="alvo" value="todos">
        <?php wp_nonce_field('vj_reenviar'); ?>
        <?php submit_button('Reenviar acesso a todos (' . count($assinantes) . ')', 'secondary', 'submit', false); ?>
      </form>
      <table class="widefat striped" style="max-width:980px">
        <thead><tr><th>Assinante</th><th>Cadastro</th><th>Origem</th><th>Situação</th><th>Último link enviado</th><th>Senha criada no site</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($assinantes as $a) :
            $env = get_user_meta($a->ID, 'vj_acesso_enviado', true);
            $sen = get_user_meta($a->ID, 'vj_senha_criada', true); ?>
          <tr>
            <td><?php echo esc_html($a->display_name); ?><br><small><?php echo esc_html($a->user_email); ?></small></td>
            <td><?php echo esc_html(mysql2date('d/m/Y', $a->user_registered)); ?></td>
            <td><?php echo esc_html(get_user_meta($a->ID, 'vj_origem', true) ?: '—'); ?></td>
            <td><?php
              $ate = get_user_meta($a->ID, 'vj_acesso_ate', true);
              echo $ate ? '<span style="color:#b26200">Cancelada — acesso até ' . esc_html(mysql2date('d/m/Y', $ate)) . '</span>' : 'Ativa';
            ?></td>
            <td><?php echo isset($fila[$a->ID]) ? '<b>na fila</b>' : ($env ? esc_html(mysql2date('d/m H:i', $env)) : '—'); ?></td>
            <td><?php echo $sen ? esc_html(mysql2date('d/m H:i', $sen)) : '—'; ?></td>
            <td>
              <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:0">
                <input type="hidden" name="action" value="vj_reenviar">
                <input type="hidden" name="alvo" value="<?php echo (int) $a->ID; ?>">
                <?php wp_nonce_field('vj_reenviar'); ?>
                <button class="button button-small">Reenviar</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <p class="description">"Senha criada no site" só aparece para quem criou a senha pelo novo link; quem criou antes pela tela antiga do WordPress aparece com "—", mas continua entrando normalmente.</p>

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
