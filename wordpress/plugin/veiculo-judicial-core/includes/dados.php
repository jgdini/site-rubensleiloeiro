<?php
/**
 * Armazenamento dos dados da coleta.
 *
 * Os dois arquivos ficam em wp-content/uploads/vj-dados/ com acesso direto BLOQUEADO (.htaccess):
 *   - vitrine.json  → servido a qualquer visitante via REST (sem link, leiloeiro, órgão)
 *   - lotes.json    → servido só a quem tem a capacidade vj_premium
 */
if (!defined('ABSPATH')) exit;

function vj_pasta_dados() {
    $up = wp_upload_dir(null, false);
    return trailingslashit($up['basedir']) . 'vj-dados';
}

function vj_preparar_pasta_dados() {
    $dir = vj_pasta_dados();
    if (!is_dir($dir)) wp_mkdir_p($dir);
    // Bloqueia acesso direto aos JSON (Apache/LiteSpeed da Hostinger respeitam .htaccess).
    $ht = $dir . '/.htaccess';
    if (!file_exists($ht)) {
        file_put_contents($ht, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
    }
    if (!file_exists($dir . '/index.php')) file_put_contents($dir . '/index.php', "<?php // silêncio\n");
    return $dir;
}

function vj_arquivo($nome) {
    return vj_pasta_dados() . '/' . ($nome === 'lotes' ? 'lotes.json' : 'vitrine.json');
}

/** Lê o JSON bruto (string) ou null. */
function vj_ler($nome) {
    $f = vj_arquivo($nome);
    return file_exists($f) ? file_get_contents($f) : null;
}

/** Grava de forma atômica (escreve em .tmp e renomeia). */
function vj_gravar($nome, $conteudo) {
    vj_preparar_pasta_dados();
    $f = vj_arquivo($nome);
    $tmp = $f . '.tmp';
    if (file_put_contents($tmp, $conteudo) === false) return false;
    return rename($tmp, $f);
}

/** Resumo para a tela de configurações. */
function vj_resumo_dados() {
    $v = vj_ler('vitrine');
    if (!$v) return null;
    $j = json_decode($v, true);
    return [
        'gerado_em'  => $j['geradoEm'] ?? null,
        'total'      => $j['total'] ?? (isset($j['lotes']) ? count($j['lotes']) : 0),
        'leiloeiros' => $j['leiloeiros'] ?? null,
    ];
}

/** Depois de gravar uma coleta nova: marca a hora e limpa o cache das páginas (LiteSpeed guarda por dias). */
function vj_apos_importar() {
    update_option('vj_ultima_importacao', current_time('mysql'), false);
    do_action('litespeed_purge_all');
    if (function_exists('wp_cache_flush')) wp_cache_flush();
}
