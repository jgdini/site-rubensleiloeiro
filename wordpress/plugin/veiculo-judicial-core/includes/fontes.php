<?php
/**
 * Área "Leiloeiros" (wp-admin) para o gestor incluir, validar, pausar e acompanhar os sites da coleta.
 *
 *  - Validação: abre o site e reconhece a plataforma. Só entra na coleta o que o robô sabe ler.
 *  - A coleta diária (GitHub) lê GET /vj/v1/fontes: { ativos: [{dominio, plataforma}], pausados: [dominio] }.
 *  - Cada inclusão/pausa fica registrada com quem fez e quando.
 * Acesso: administradores e o papel "Gestor de leiloeiros" (capacidade vj_gerir_fontes).
 */
if (!defined('ABSPATH')) exit;

const VJ_CAP_FONTES = 'vj_gerir_fontes';
const VJ_FONTES_OPCAO = 'vj_fontes';          // [dominio => {dominio, url, plataforma, status, motivo, por, em}]
const VJ_FONTES_LOG = 'vj_fontes_log';

// Papel e capacidade (criados uma vez; roles ficam gravadas no banco).
add_action('init', function () {
    if (get_option('vj_fontes_papel') === '1') return;
    add_role('vj_gestor', 'Gestor de leiloeiros', ['read' => true, VJ_CAP => true, VJ_CAP_FONTES => true]);
    if ($a = get_role('administrator')) $a->add_cap(VJ_CAP_FONTES);
    update_option('vj_fontes_papel', '1', true);
});

/* ---------------- Dados ---------------- */

function vj_fontes() {
    $f = get_option(VJ_FONTES_OPCAO, []);
    return is_array($f) ? $f : [];
}
function vj_fontes_salvar($f) {
    update_option(VJ_FONTES_OPCAO, $f, false);
}
function vj_fontes_registrar($acao, $dominio, $resultado) {
    $log = get_option(VJ_FONTES_LOG, []);
    if (!is_array($log)) $log = [];
    $u = wp_get_current_user();
    array_unshift($log, ['quando' => current_time('mysql'), 'quem' => $u->exists() ? $u->display_name . ' (' . $u->user_email . ')' : 'sistema', 'acao' => $acao, 'dominio' => $dominio, 'resultado' => $resultado]);
    update_option(VJ_FONTES_LOG, array_slice($log, 0, 500), false);
}
function vj_dominio($s) {
    $s = strtolower(trim((string) $s));
    $s = preg_replace('#^https?://#', '', $s);
    $s = preg_replace('#^www\.#', '', $s);
    return preg_replace('#[/?\#].*$#', '', $s);
}

/** Sites que a coleta monitora hoje (vem em lotes.json → "sites"). */
function vj_sites_coleta() {
    $bruto = vj_ler('lotes');
    if (!$bruto) return [];
    $j = json_decode($bruto, true);
    return is_array($j['sites'] ?? null) ? $j['sites'] : [];
}

/* ---------------- Validação ---------------- */

const VJ_PLATAFORMAS = [
    'spl'       => ['nome' => 'Sua Plataforma de Leilão (SPL)', 're' => '/suaplataformadeleilao|ApiEngine\/GetBusca|__RequestVerificationToken/i'],
    'platb'     => ['nome' => 'Plataforma B', 're' => '/d1mdxpzu4pgcoh\.cloudfront\.net/i'],
    'suporte'   => ['nome' => 'Suporte Leilões', 're' => '/static\.suporteleiloes\.com\.br/i'],
    'leilaopro' => ['nome' => 'Leilão Pro', 're' => '/icon-leilaopro|leilao\.pro\b/i'],
];

/**
 * Abre o site e diz o que acontece com ele.
 * status: ativo (entra na coleta) | coleta (já monitorado) | portal (já vem pelo portal) | pendente | bloqueado | fora
 */
function vj_validar_fonte($entrada) {
    $dom = vj_dominio($entrada);
    $r = ['dominio' => $dom, 'url' => '', 'plataforma' => '', 'status' => 'fora', 'motivo' => ''];
    if (!$dom || !preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $dom)) {
        $r['motivo'] = 'Endereço inválido. Cole o link do site do leiloeiro (ex.: https://www.exemploleiloes.com.br).';
        return $r;
    }
    foreach (vj_sites_coleta() as $s) {
        if (($s['dominio'] ?? '') === $dom) {
            $r['status'] = 'coleta';
            $r['plataforma'] = $s['plataforma'] ?? ($s['fonte'] ?? '');
            $r['motivo'] = 'Este leiloeiro já está na coleta' . (isset($s['veiculos']) ? ' (' . (int) $s['veiculos'] . ' veículos judiciais hoje).' : '.');
            return $r;
        }
    }
    $html = '';
    $codigo = 0;
    foreach (["https://www.$dom/", "https://$dom/"] as $url) {
        $resp = wp_remote_get($url, ['timeout' => 20, 'redirection' => 5, 'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36']);
        if (is_wp_error($resp)) continue;
        $codigo = (int) wp_remote_retrieve_response_code($resp);
        $html = (string) wp_remote_retrieve_body($resp);
        $r['url'] = $url;
        if ($codigo && $codigo < 500) break;
    }
    if (!$html && !$codigo) {
        $r['motivo'] = 'O site não respondeu (fora do ar ou endereço errado).';
        return $r;
    }
    if (preg_match('/superbid|canaljudicial|sold\.com\.br/i', $html)) {
        $r['status'] = 'bloqueado';
        $r['motivo'] = 'Site da rede Superbid/Canal Judicial, que bloqueia acesso automático.';
        return $r;
    }
    // Só o desafio anti-robô de verdade (Cloudflare etc.); reCAPTCHA de formulário não impede a leitura.
    if (preg_match('/<title>\s*just a moment|__cf_chl|cf-challenge|cf_chl_opt/i', $html) || in_array($codigo, [403, 429], true)) {
        $r['status'] = 'bloqueado';
        $r['motivo'] = 'O site bloqueia acesso automático (proteção anti-robô). Não dá para incluir na coleta.';
        return $r;
    }
    if ($codigo >= 400) {
        $r['motivo'] = "O site respondeu com erro ($codigo). Confira o endereço.";
        return $r;
    }
    foreach (VJ_PLATAFORMAS as $id => $p) {
        if (preg_match($p['re'], $html)) {
            $r['status'] = 'ativo';
            $r['plataforma'] = $id;
            $r['motivo'] = 'Compatível (' . $p['nome'] . '). Entra na próxima coleta diária; os veículos judiciais aparecem no site depois dela.';
            return $r;
        }
    }
    if (preg_match('/leiloesjudiciais\.com\.br|api\.leiloesjudiciais/i', $html)) {
        $r['status'] = 'portal';
        $r['motivo'] = 'Leiloeiro da rede Leilões Judiciais: os veículos dele já entram pelo portal.';
        return $r;
    }
    $r['status'] = 'pendente';
    $r['motivo'] = 'O site funciona, mas usa uma plataforma que o robô ainda não lê. Ficou registrado para avaliação da equipe técnica.';
    return $r;
}

/* ---------------- API para a coleta ---------------- */

add_action('rest_api_init', function () {
    register_rest_route('vj/v1', '/fontes', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () {
            $ativos = [];
            $pausados = [];
            foreach (vj_fontes() as $f) {
                if ($f['status'] === 'ativo' && $f['plataforma']) $ativos[] = ['dominio' => $f['dominio'], 'plataforma' => $f['plataforma']];
                if ($f['status'] === 'pausado') $pausados[] = $f['dominio'];
            }
            return ['ativos' => $ativos, 'pausados' => $pausados];
        },
    ]);
});

/* ---------------- Ações ---------------- */

add_action('admin_post_vj_fontes_validar', function () {
    if (!current_user_can(VJ_CAP_FONTES)) wp_die('Sem permissão.');
    check_admin_referer('vj_fontes');
    $linhas = preg_split('/[\s,;]+/', (string) wp_unslash($_POST['links'] ?? ''), -1, PREG_SPLIT_NO_EMPTY);
    $linhas = array_slice(array_unique($linhas), 0, 20); // até 20 por vez (cada um leva alguns segundos)
    $fontes = vj_fontes();
    $resultados = [];
    $u = wp_get_current_user();
    foreach ($linhas as $l) {
        $r = vj_validar_fonte($l);
        $resultados[] = $r;
        if (!$r['dominio']) continue;
        $antes = $fontes[$r['dominio']] ?? null;
        if (in_array($r['status'], ['ativo', 'pendente', 'bloqueado'], true) && !($antes && $antes['status'] === 'pausado')) {
            $fontes[$r['dominio']] = $r + ['por' => $u->display_name, 'em' => current_time('mysql')];
        }
        vj_fontes_registrar('validou', $r['dominio'] ?: $l, $r['status'] . ' — ' . $r['motivo']);
    }
    vj_fontes_salvar($fontes);
    set_transient('vj_fontes_resultado_' . get_current_user_id(), $resultados, 10 * MINUTE_IN_SECONDS);
    wp_safe_redirect(admin_url('admin.php?page=vj-leiloeiros&validado=1'));
    exit;
});

add_action('admin_post_vj_fontes_status', function () {
    if (!current_user_can(VJ_CAP_FONTES)) wp_die('Sem permissão.');
    check_admin_referer('vj_fontes');
    $dom = vj_dominio(wp_unslash($_POST['dominio'] ?? ''));
    $acao = sanitize_key($_POST['acao'] ?? '');
    $fontes = vj_fontes();
    $u = wp_get_current_user();
    if ($dom) {
        if ($acao === 'pausar') {
            $plat = $fontes[$dom]['plataforma'] ?? '';
            $fontes[$dom] = ['dominio' => $dom, 'url' => $fontes[$dom]['url'] ?? '', 'plataforma' => $plat, 'status' => 'pausado', 'motivo' => 'Pausado pelo gestor', 'por' => $u->display_name, 'em' => current_time('mysql'), 'antes' => $fontes[$dom]['status'] ?? 'coleta'];
            vj_fontes_registrar('pausou', $dom, 'sai da coleta e do site a partir da próxima coleta');
        } elseif ($acao === 'reativar' && isset($fontes[$dom])) {
            $antes = $fontes[$dom]['antes'] ?? 'coleta';
            if ($antes === 'coleta' || !$fontes[$dom]['plataforma']) unset($fontes[$dom]); // volta a ser só o da lista padrão
            else { $fontes[$dom]['status'] = $antes; $fontes[$dom]['motivo'] = 'Reativado pelo gestor'; $fontes[$dom]['em'] = current_time('mysql'); }
            vj_fontes_registrar('reativou', $dom, 'volta na próxima coleta');
        } elseif ($acao === 'remover' && isset($fontes[$dom])) {
            unset($fontes[$dom]);
            vj_fontes_registrar('removeu', $dom, 'removido da lista do gestor');
        }
        vj_fontes_salvar($fontes);
    }
    wp_safe_redirect(admin_url('admin.php?page=vj-leiloeiros&ok=' . $acao));
    exit;
});

/* ---------------- Tela ---------------- */

add_action('admin_menu', function () {
    add_menu_page('Leiloeiros', 'Leiloeiros', VJ_CAP_FONTES, 'vj-leiloeiros', 'vj_tela_fontes', 'dashicons-hammer', 3);
});

function vj_botao_status($dom, $acao, $rotulo, $estilo = 'button-small') {
    ?>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline">
      <input type="hidden" name="action" value="vj_fontes_status">
      <input type="hidden" name="dominio" value="<?php echo esc_attr($dom); ?>">
      <input type="hidden" name="acao" value="<?php echo esc_attr($acao); ?>">
      <?php wp_nonce_field('vj_fontes'); ?>
      <button class="button <?php echo esc_attr($estilo); ?>"<?php echo $acao === 'pausar' ? " onclick=\"return confirm('Pausar " . esc_js($dom) . "? Os veículos dele saem do site na próxima coleta.')\"" : ''; ?>><?php echo esc_html($rotulo); ?></button>
    </form>
    <?php
}

function vj_tela_fontes() {
    if (!current_user_can(VJ_CAP_FONTES)) wp_die('Sem permissão.');
    $fontes = vj_fontes();
    $sites = vj_sites_coleta();
    $resumo = vj_resumo_dados();
    $resultados = !empty($_GET['validado']) ? get_transient('vj_fontes_resultado_' . get_current_user_id()) : null;
    $rotulo = ['ativo' => '✅ Compatível — entra na próxima coleta', 'coleta' => '✅ Já está na coleta', 'portal' => '✅ Já vem pelo portal Leilões Judiciais', 'pendente' => '🔧 Plataforma ainda não lida', 'bloqueado' => '⛔ Bloqueia robôs', 'fora' => '⚠️ Fora do ar / endereço inválido', 'pausado' => '⏸️ Pausado'];
    $nomePlat = array_map(function ($p) { return $p['nome']; }, VJ_PLATAFORMAS) + [
        'leiloesjudiciais' => 'Portal Leilões Judiciais', 'megaleiloes' => 'Mega Leilões', 'lancejudicial' => 'Lance Judicial',
        'leilaovip' => 'Leilão VIP', 'd1lance' => 'D1Lance', 'eleiloes' => 'E-Leilões', 'zuk' => 'Portal Zuk',
        'tjsp' => 'Sua Plataforma de Leilão (SPL)', 'suporte' => 'Suporte Leilões',
    ];
    ?>
    <div class="wrap">
      <h1>Leiloeiros</h1>
      <p>Inclua aqui os sites de leiloeiros para a coleta diária (6h). O site é aberto e conferido na hora: só entram os que o robô consegue ler. Cada inclusão e pausa fica registrada com o seu nome.</p>
      <?php if (!empty($_GET['ok'])) echo '<div class="notice notice-success is-dismissible"><p>Feito. A mudança vale a partir da próxima coleta.</p></div>'; ?>

      <h2>Incluir leiloeiros</h2>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="vj_fontes_validar">
        <?php wp_nonce_field('vj_fontes'); ?>
        <textarea name="links" rows="4" class="large-text" placeholder="Cole um ou mais links (um por linha), ex.: https://www.exemploleiloes.com.br"></textarea>
        <p class="description">Até 20 por vez. Cada site leva alguns segundos para ser conferido.</p>
        <?php submit_button('Validar e incluir', 'primary', 'submit', false); ?>
      </form>

      <?php if ($resultados) : ?>
        <h2>Resultado da validação</h2>
        <table class="widefat striped" style="max-width:1100px"><thead><tr><th>Site</th><th>Resultado</th><th>Detalhe</th></tr></thead><tbody>
        <?php foreach ($resultados as $r) printf('<tr><td>%s</td><td><b>%s</b></td><td>%s</td></tr>', esc_html($r['dominio'] ?: '—'), esc_html($rotulo[$r['status']] ?? $r['status']), esc_html($r['motivo'])); ?>
        </tbody></table>
      <?php endif; ?>

      <h2>Incluídos ou pausados por aqui</h2>
      <?php if (!$fontes) : ?><p><em>Nenhum ainda.</em></p><?php else : ?>
      <table class="widefat striped" style="max-width:1100px"><thead><tr><th>Site</th><th>Situação</th><th>Plataforma</th><th>Por</th><th>Quando</th><th></th></tr></thead><tbody>
      <?php foreach ($fontes as $f) : ?>
        <tr>
          <td><a href="<?php echo esc_url($f['url'] ?: 'https://' . $f['dominio']); ?>" target="_blank" rel="noopener"><?php echo esc_html($f['dominio']); ?></a></td>
          <td><?php echo esc_html($rotulo[$f['status']] ?? $f['status']); ?><br><small><?php echo esc_html($f['motivo'] ?? ''); ?></small></td>
          <td><?php echo esc_html($nomePlat[$f['plataforma']] ?? ($f['plataforma'] ?: '—')); ?></td>
          <td><?php echo esc_html($f['por'] ?? '—'); ?></td>
          <td><?php echo esc_html(!empty($f['em']) ? mysql2date('d/m/Y H:i', $f['em']) : '—'); ?></td>
          <td>
            <?php if ($f['status'] === 'pausado') vj_botao_status($f['dominio'], 'reativar', 'Reativar');
                  elseif ($f['status'] === 'ativo') vj_botao_status($f['dominio'], 'pausar', 'Pausar');
                  if ($f['status'] !== 'pausado') vj_botao_status($f['dominio'], 'remover', 'Remover da lista'); ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody></table>
      <?php endif; ?>

      <h2>Leiloeiros na coleta</h2>
      <p class="description"><?php echo $resumo ? 'Coleta de ' . esc_html(wp_date('d/m/Y H:i', strtotime($resumo['gerado_em']))) . ' · ' : ''; ?><?php echo count($sites); ?> sites monitorados. "Veículos hoje" conta só os leilões judiciais encontrados na última coleta.</p>
      <?php if ($sites) : ?>
      <div style="max-width:1100px;max-height:520px;overflow:auto;border:1px solid #c3c4c7">
      <table class="widefat striped" style="border:0"><thead><tr><th>Site</th><th>Veículos hoje</th><th>Origem</th><th></th></tr></thead><tbody>
      <?php foreach ($sites as $s) :
          $dom = $s['dominio'];
          $pausado = ($fontes[$dom]['status'] ?? '') === 'pausado'; ?>
        <tr>
          <td><a href="https://<?php echo esc_attr($dom); ?>" target="_blank" rel="noopener"><?php echo esc_html($dom); ?></a></td>
          <td><?php echo (int) ($s['veiculos'] ?? 0); ?></td>
          <td><?php echo esc_html($nomePlat[$s['plataforma'] ?? ''] ?? ($nomePlat[$s['fonte'] ?? ''] ?? ($s['fonte'] ?? ''))); ?></td>
          <td><?php $pausado ? vj_botao_status($dom, 'reativar', 'Reativar') : vj_botao_status($dom, 'pausar', 'Pausar'); ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody></table></div>
      <?php else : ?><p><em>A lista aparece depois da próxima coleta diária.</em></p><?php endif; ?>

      <h2>Registro</h2>
      <?php $log = get_option(VJ_FONTES_LOG, []); if ($log) : ?>
      <div style="max-width:1100px;max-height:300px;overflow:auto;border:1px solid #c3c4c7">
      <table class="widefat striped" style="border:0"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Site</th><th>Resultado</th></tr></thead><tbody>
      <?php foreach ($log as $l) printf('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>', esc_html(mysql2date('d/m/Y H:i', $l['quando'])), esc_html($l['quem']), esc_html($l['acao']), esc_html($l['dominio']), esc_html($l['resultado'])); ?>
      </tbody></table></div>
      <?php else : ?><p><em>Nada registrado ainda.</em></p><?php endif; ?>
    </div>
    <?php
}

/* ---------------- Diagnóstico: o servidor do site consegue ler Soleon e Degrau? ---------------- */
add_action('admin_post_vj_diagnostico_coleta', function () {
    if (!current_user_can('manage_options')) wp_die('Sem permissão.');
    check_admin_referer('vj_diagnostico');
    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
    $linhas = [];
    // Soleon: busca de veículos
    foreach (['apiceleiloes.com.br', 'cencin.com.br', 'danielgarcialeiloes.com.br'] as $d) {
        $t = microtime(true);
        $r = wp_remote_get("https://www.$d/lotes/search?tipo=veiculo", ['timeout' => 25, 'user-agent' => $ua]);
        $cod = is_wp_error($r) ? $r->get_error_message() : wp_remote_retrieve_response_code($r);
        $n = is_wp_error($r) ? 0 : preg_match_all('#/item/\d+/detalhes#', wp_remote_retrieve_body($r));
        $linhas[] = sprintf('Soleon  %-28s HTTP %s  itens na página: %d  (%.1fs)', $d, $cod, $n, microtime(true) - $t);
    }
    // Degrau (SPL): sessão + API de busca
    foreach (['agleiloes.com.br', 'arremaxleiloes.com.br', '123leiloes.com.br'] as $d) {
        $t = microtime(true);
        $r = wp_remote_get("https://www.$d/busca/", ['timeout' => 25, 'user-agent' => $ua]);
        if (is_wp_error($r)) { $linhas[] = "Degrau  $d  erro: " . $r->get_error_message(); continue; }
        $html = wp_remote_retrieve_body($r);
        preg_match('/name="__RequestVerificationToken"[^>]*value="([^"]+)"/', $html, $m);
        $cookies = wp_remote_retrieve_cookies($r);
        $corpo = ['RangeValores' => 0, 'Scopo' => 0, 'IgnoreScopo' => 0, 'OrientacaoBusca' => 0, 'Mapa' => '', 'Busca' => '', 'ID_Categoria' => 0, 'ID_Estado' => 0, 'ID_Cidade' => 0,
            'Bairro' => '', 'ID_Regiao' => 0, 'ValorMinSelecionado' => 0, 'ValorMaxSelecionado' => 0, 'CFGs' => '', 'Pagina' => 1, 'sInL' => '', 'Ordem' => 0, 'OrdSt' => 0,
            'QtdPorPagina' => 100, 'SubStatus' => [], 'ID_Leiloes_Status' => [], 'PaginaIndex' => 1, 'BuscaProcesso' => '', 'NomesPartes' => '', 'CodLeilao' => '',
            'TiposLeiloes' => [], 'PracaAtual' => 0, 'DataAbertura' => '', 'DataEncerramento' => '', 'Filtro' => new stdClass()];
        $api = wp_remote_post("https://www.$d/ApiEngine/GetBusca/1/3/0", ['timeout' => 25, 'user-agent' => $ua, 'cookies' => $cookies,
            'headers' => ['__RVT' => $m[1] ?? '', 'X-Requested-With' => 'XMLHttpRequest', 'Content-Type' => 'application/json; charset=utf-8', 'Referer' => "https://www.$d/busca/"], 'body' => wp_json_encode($corpo)]);
        $cod = is_wp_error($api) ? $api->get_error_message() : wp_remote_retrieve_response_code($api);
        $j = is_wp_error($api) ? null : json_decode(wp_remote_retrieve_body($api), true);
        $n = is_array($j['Lotes'] ?? null) ? count($j['Lotes']) : 0;
        $linhas[] = sprintf('Degrau  %-28s página HTTP %s  token %s  API HTTP %s  lotes: %d  (%.1fs)', $d, wp_remote_retrieve_response_code($r), empty($m[1]) ? 'NÃO' : 'sim', $cod, $n, microtime(true) - $t);
    }
    wp_die('<h2>Diagnóstico da coleta a partir do servidor do site</h2><pre>' . esc_html(implode("\n", $linhas)) . '</pre><p><a href="' . esc_url(admin_url('admin.php?page=vj-leiloeiros')) . '">Voltar</a></p>', 'Diagnóstico', ['response' => 200]);
});
add_action('admin_notices', function () {
    if (!current_user_can('manage_options') || ($_GET['page'] ?? '') !== 'vj-leiloeiros') return;
    echo '<div class="notice notice-info"><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="margin:8px 0">'
        . '<input type="hidden" name="action" value="vj_diagnostico_coleta">' . wp_nonce_field('vj_diagnostico', '_wpnonce', true, false)
        . 'Teste técnico: <button class="button button-small">Testar leitura Soleon/Degrau a partir do servidor</button></form></div>';
});
