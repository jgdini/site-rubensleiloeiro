<?php
/**
 * Ativação/desativação de assinantes.
 * O webhook da Kiwify (includes/kiwify.php) chama só estas duas funções.
 */
if (!defined('ABSPATH')) exit;

/**
 * Cria (se preciso) o usuário pelo e-mail e dá o papel de assinante.
 * Usuário novo recebe o e-mail padrão do WordPress para definir a senha.
 */
function vj_ativar_assinante($email, $nome = '', $origem = 'manual') {
    $email = sanitize_email($email);
    if (!is_email($email)) return new WP_Error('vj_email', 'E-mail inválido.');

    $user = get_user_by('email', $email);
    $novo = false;
    if (!$user) {
        $login = sanitize_user(current(explode('@', $email)), true);
        $base = $login ?: 'assinante';
        $i = 1;
        while (username_exists($login)) $login = $base . $i++;
        $id = wp_insert_user([
            'user_login'   => $login,
            'user_email'   => $email,
            'user_pass'    => wp_generate_password(24),
            'display_name' => $nome ?: $login,
            'first_name'   => $nome ? current(explode(' ', $nome)) : '',
            'role'         => VJ_ROLE,
        ]);
        if (is_wp_error($id)) return $id;
        $user = get_user_by('id', $id);
        $novo = true;
    } elseif (!in_array('administrator', (array) $user->roles, true)) {
        $user->add_role(VJ_ROLE);
    }

    update_user_meta($user->ID, 'vj_status', 'ativo');
    update_user_meta($user->ID, 'vj_origem', sanitize_text_field($origem));
    update_user_meta($user->ID, 'vj_ativado_em', current_time('mysql'));

    // Conta nova (ou que nunca criou senha): e-mail de boas-vindas com o link do site para criar a senha.
    if ($novo || !get_user_meta($user->ID, 'vj_senha_criada', true)) vj_enviar_link_senha($user, true);
    return $user->ID;
}

/** Remove o acesso premium (cancelamento, reembolso, chargeback). */
function vj_desativar_assinante($email, $motivo = '') {
    $user = get_user_by('email', sanitize_email($email));
    if (!$user) return false;
    $user->remove_role(VJ_ROLE);
    if (empty($user->roles)) $user->set_role('subscriber');
    update_user_meta($user->ID, 'vj_status', 'inativo');
    update_user_meta($user->ID, 'vj_motivo', sanitize_text_field($motivo));
    update_user_meta($user->ID, 'vj_desativado_em', current_time('mysql'));
    return true;
}

function vj_eh_assinante($user_id = null) {
    return user_can($user_id ?: get_current_user_id(), VJ_CAP);
}
