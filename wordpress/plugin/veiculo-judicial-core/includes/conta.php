<?php
/**
 * Conta do assinante sem passar pelas telas do WordPress:
 *   GET  /vj/v1/sessao          quem está logado (sempre ao vivo — as páginas ficam em cache)
 *   POST /vj/v1/senha/pedir     { email }              -> e-mail com link para criar/trocar a senha
 *   POST /vj/v1/senha/definir   { u, chave, senha }    -> grava a senha e já deixa logado
 * O link do e-mail abre o próprio site: /?vj-senha={chave}&u={login}
 */
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('vj/v1', '/sessao', [
        'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => 'vj_rest_sessao',
    ]);
    register_rest_route('vj/v1', '/senha/pedir', [
        'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'vj_rest_senha_pedir',
    ]);
    register_rest_route('vj/v1', '/senha/definir', [
        'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'vj_rest_senha_definir',
    ]);
});

/** Nada de cache nas respostas de conta (nem no navegador, nem no LiteSpeed/CDN). */
function vj_sem_cache() {
    do_action('litespeed_control_set_nocache', 'conta do assinante');
    nocache_headers();
}

/**
 * Sessão a partir do cookie de login. A API REST ignora o cookie sem nonce, e o nonce que vem na página
 * em cache é de visitante — por isso o usuário é lido aqui direto do cookie.
 */
function vj_rest_sessao() {
    vj_sem_cache();
    $id = wp_validate_auth_cookie('', 'logged_in');
    if (!$id) return ['logado' => false];
    wp_set_current_user($id);
    $u = wp_get_current_user();
    return [
        'logado'    => true,
        'nome'      => $u->display_name,
        'assinante' => user_can($u, VJ_CAP),
        'nonce'     => wp_create_nonce('wp_rest'),
        'sair'      => vj_url_sair(),
    ];
}

/** Sair pelo próprio site (a tela de logout do WordPress pede confirmação). */
function vj_url_sair() {
    return add_query_arg(['vj-sair' => '1', 'v' => wp_create_nonce('vj_sair')], home_url('/'));
}
add_action('template_redirect', function () {
    if (empty($_GET['vj-sair'])) return;
    vj_sem_cache();
    $id = wp_validate_auth_cookie('', 'logged_in');
    if ($id) {
        wp_set_current_user($id);
        if (wp_verify_nonce($_GET['v'] ?? '', 'vj_sair')) wp_logout();
    }
    wp_safe_redirect(home_url('/'));
    exit;
}, 1);

function vj_link_senha($user, $chave) {
    return add_query_arg(['vj-senha' => $chave, 'u' => rawurlencode($user->user_login)], home_url('/'));
}

/** E-mail com o link para criar (primeiro acesso) ou trocar a senha. */
function vj_enviar_link_senha($user, $primeiro_acesso = false) {
    $chave = get_password_reset_key($user);
    if (is_wp_error($chave)) return $chave;
    $marca = 'Veículo Judicial';
    $link = vj_link_senha($user, $chave);
    $nome = $user->first_name ?: $user->display_name;
    $assunto = $primeiro_acesso ? "Bem-vindo ao $marca — crie sua senha" : "$marca — crie uma nova senha";
    $corpo = "Olá, $nome!\n\n"
        . ($primeiro_acesso
            ? "Sua assinatura do $marca está ativa. Para entrar no site, crie sua senha neste link:\n\n"
            : "Recebemos um pedido para criar uma nova senha no $marca. Use este link:\n\n")
        . "$link\n\n"
        . "O link vale por 24 horas. Depois disso, use \"Primeiro acesso ou esqueceu a senha?\" na tela de login para receber outro.\n\n"
        . "Para entrar, use este e-mail ({$user->user_email}) e a senha que você criar.\n\n"
        . ($primeiro_acesso ? '' : "Se você não pediu isso, é só ignorar este e-mail.\n\n")
        . "$marca\n" . home_url('/');
    return wp_mail($user->user_email, $assunto, $corpo);
}

function vj_rest_senha_pedir(WP_REST_Request $req) {
    vj_sem_cache();
    $email = sanitize_email((string) ($req->get_json_params()['email'] ?? ''));
    $resposta = ['ok' => true, 'mensagem' => 'Se este e-mail tiver cadastro, enviamos um link para criar a senha. Confira também o spam.'];
    if (!is_email($email)) return new WP_Error('vj_email', 'Informe um e-mail válido.', ['status' => 400]);
    // Um pedido por e-mail a cada 2 minutos (evita uso do formulário para disparar e-mails).
    $trava = 'vj_senha_' . md5(strtolower($email));
    if (get_transient($trava)) return $resposta;
    set_transient($trava, 1, 2 * MINUTE_IN_SECONDS);
    $user = get_user_by('email', $email);
    if ($user) vj_enviar_link_senha($user, !get_user_meta($user->ID, 'vj_senha_criada', true));
    return $resposta; // mesma resposta exista ou não a conta
}

function vj_rest_senha_definir(WP_REST_Request $req) {
    vj_sem_cache();
    $p = $req->get_json_params();
    $login = sanitize_user(rawurldecode((string) ($p['u'] ?? '')));
    $chave = (string) ($p['chave'] ?? '');
    $senha = (string) ($p['senha'] ?? '');
    if (strlen($senha) < 8) return new WP_Error('vj_senha', 'A senha precisa ter pelo menos 8 caracteres.', ['status' => 400]);
    $user = check_password_reset_key($chave, $login);
    if (is_wp_error($user)) {
        return new WP_Error('vj_link', 'Este link expirou ou já foi usado. Peça um novo em "Primeiro acesso ou esqueceu a senha?".', ['status' => 400]);
    }
    reset_password($user, $senha);
    update_user_meta($user->ID, 'vj_senha_criada', current_time('mysql'));
    wp_set_auth_cookie($user->ID, true, is_ssl());
    return ['ok' => true, 'nome' => $user->display_name];
}

// Quem usar "Perdeu a senha?" do WordPress também recebe o link do site, não o da tela do WP.
add_filter('retrieve_password_notification_email', function ($email, $chave, $login, $user) {
    if ($user && !user_can($user, 'edit_posts')) {
        $email['message'] = "Olá!\n\nPara criar uma nova senha no Veículo Judicial, use este link:\n\n" . vj_link_senha($user, $chave) . "\n\nSe você não pediu isso, é só ignorar este e-mail.";
    }
    return $email;
}, 10, 4);

// Assinante que cair na tela de login do WordPress volta para o site (onde fica o login).
add_action('login_init', function () {
    $acao = $_REQUEST['action'] ?? 'login';
    if (in_array($acao, ['lostpassword', 'retrievepassword'], true) && empty($_POST)) {
        wp_safe_redirect(add_query_arg('vj-esqueci', '1', home_url('/')));
        exit;
    }
    if (in_array($acao, ['rp', 'resetpass'], true) && !empty($_GET['key']) && !empty($_GET['login']) && empty($_POST)) {
        wp_safe_redirect(add_query_arg(['vj-senha' => $_GET['key'], 'u' => rawurlencode(wp_unslash($_GET['login']))], home_url('/')));
        exit;
    }
});
