<?php
/**
 * Rotas REST (namespace vj/v1):
 *   GET  /vitrine   público — vitrine sem link/leiloeiro/órgão
 *   GET  /lotes     só assinante (capacidade vj_premium) — base completa
 *   POST /importar  coleta diária; exige cabeçalho X-VJ-Token
 *   POST /login     login do modal (e-mail ou usuário + senha)
 */
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('vj/v1', '/vitrine', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () { return vj_responder_json('vitrine', 300); },
    ]);

    register_rest_route('vj/v1', '/lotes', [
        'methods'             => 'GET',
        'permission_callback' => function () { return current_user_can(VJ_CAP); },
        'callback'            => function () { return vj_responder_json('lotes', 0); },
    ]);

    register_rest_route('vj/v1', '/importar', [
        'methods'             => 'POST',
        'permission_callback' => 'vj_token_valido',
        'callback'            => 'vj_rest_importar',
    ]);

    register_rest_route('vj/v1', '/login', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'vj_rest_login',
    ]);
});

/** Entrega o JSON salvo sem decodificar (arquivo de ~1 MB). */
function vj_responder_json($nome, $cache_segundos) {
    $bruto = vj_ler($nome);
    if ($bruto === null) {
        return new WP_REST_Response(['geradoEm' => null, 'total' => 0, 'fontes' => [], 'lotes' => []], 200);
    }
    // Resposta crua: evita json_decode/encode de todo o arquivo a cada visita.
    add_filter('rest_pre_serve_request', function ($servido) use ($bruto, $cache_segundos) {
        if ($servido) return $servido;
        header('Content-Type: application/json; charset=utf-8');
        header($cache_segundos ? "Cache-Control: public, max-age=$cache_segundos" : 'Cache-Control: private, no-store');
        echo $bruto;
        return true;
    }, 10, 1);
    return new WP_REST_Response(null, 200);
}

function vj_token_valido(WP_REST_Request $req) {
    $esperado = (string) get_option('vj_token');
    $enviado = (string) $req->get_header('x-vj-token');
    return $esperado !== '' && hash_equals($esperado, $enviado);
}

/** Corpo: { "lotes": {…lotes.json…}, "vitrine": {…vitrine.json…} } */
function vj_rest_importar(WP_REST_Request $req) {
    $corpo = json_decode($req->get_body(), true);
    if (!is_array($corpo) || empty($corpo['lotes']['lotes']) || empty($corpo['vitrine']['lotes'])) {
        return new WP_Error('vj_formato', 'Formato inválido: esperado { lotes: {...}, vitrine: {...} }.', ['status' => 400]);
    }
    $ok1 = vj_gravar('lotes', wp_json_encode($corpo['lotes'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $ok2 = vj_gravar('vitrine', wp_json_encode($corpo['vitrine'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    if (!$ok1 || !$ok2) return new WP_Error('vj_gravar', 'Não foi possível gravar os arquivos.', ['status' => 500]);
    vj_apos_importar();
    return ['ok' => true, 'total' => count($corpo['lotes']['lotes'])];
}

function vj_rest_login(WP_REST_Request $req) {
    $p = $req->get_json_params() ?: $req->get_body_params();
    $login = trim((string) ($p['email'] ?? ''));
    $senha = (string) ($p['senha'] ?? '');
    if ($login === '' || $senha === '') {
        return new WP_Error('vj_login', 'Informe e-mail e senha.', ['status' => 400]);
    }
    if (is_email($login)) {
        $u = get_user_by('email', $login);
        if ($u) $login = $u->user_login;
    }
    $user = wp_signon(['user_login' => $login, 'user_password' => $senha, 'remember' => true], is_ssl());
    if (is_wp_error($user)) {
        return new WP_Error('vj_login', 'E-mail ou senha incorretos.', ['status' => 401]);
    }
    return ['ok' => true, 'nome' => $user->display_name, 'assinante' => user_can($user, VJ_CAP)];
}
