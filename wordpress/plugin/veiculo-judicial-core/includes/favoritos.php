<?php
/**
 * Favoritos: assinantes salvam lotes para consulta posterior.
 * Armazenado em user_meta (vj_favoritos) como array de IDs.
 * Rotas: GET/POST /vj/v1/favoritos   e   DELETE /vj/v1/favoritos/{id}
 */
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('vj/v1', '/favoritos', [
        [
            'methods'             => 'GET',
            'callback'            => 'vj_fav_listar',
            'permission_callback' => 'vj_fav_permissao',
        ],
        [
            'methods'             => 'POST',
            'callback'            => 'vj_fav_adicionar',
            'permission_callback' => 'vj_fav_permissao',
            'args'                => ['id' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
        ],
    ]);
    register_rest_route('vj/v1', '/favoritos/(?P<id>[a-zA-Z0-9_\-\.]+)', [
        'methods'             => 'DELETE',
        'callback'            => 'vj_fav_remover',
        'permission_callback' => 'vj_fav_permissao',
    ]);
});

function vj_fav_permissao(): bool {
    return is_user_logged_in() && current_user_can(VJ_CAP);
}

function vj_fav_ids(int $uid = 0): array {
    if (!$uid) $uid = get_current_user_id();
    $v = get_user_meta($uid, 'vj_favoritos', true);
    return is_array($v) ? array_values($v) : [];
}

function vj_fav_listar(): WP_REST_Response {
    return rest_ensure_response(['ids' => vj_fav_ids()]);
}

function vj_fav_adicionar(WP_REST_Request $req) {
    $id = $req->get_param('id');
    $ids = vj_fav_ids();
    if (!in_array($id, $ids, true)) {
        $ids[] = $id;
        if (count($ids) > 300) $ids = array_slice($ids, -300); // teto de 300 favoritos
        update_user_meta(get_current_user_id(), 'vj_favoritos', $ids);
    }
    return rest_ensure_response(['ids' => $ids]);
}

function vj_fav_remover(WP_REST_Request $req) {
    $id = sanitize_text_field($req['id']);
    $ids = array_values(array_filter(vj_fav_ids(), fn($i) => $i !== $id));
    update_user_meta(get_current_user_id(), 'vj_favoritos', $ids);
    return rest_ensure_response(['ids' => $ids]);
}
