<?php
/**
 * SEO / AEO / GEO do Veículo Judicial.
 *
 * A vitrine da home é montada por JavaScript, então o Google e as IAs quase não a enxergam.
 * Aqui geramos páginas em HTML puro a partir da mesma vitrine.json (só dados públicos:
 * sem link do leilão, leiloeiro, processo ou custo total — isso continua exclusivo do assinante):
 *
 *   /leilao-judicial/                          hub com categorias, estados e marcas
 *   /leilao-judicial/{categoria}/              ex.: /leilao-judicial/carros/
 *   /leilao-judicial/{categoria}/{uf}/         ex.: /leilao-judicial/carros/sp/
 *   /leilao-judicial/marca/{marca}/            ex.: /leilao-judicial/marca/honda/
 *   /veiculo/{titulo-ano-cidade}-{hash}/       página de cada veículo
 *   /como-comprar-veiculo-em-leilao-judicial/  guia + perguntas frequentes (FAQPage)
 *   /llms.txt                                  resumo do site para IAs
 *
 * Tudo entra no sitemap nativo do WordPress (/wp-sitemap.xml).
 */
if (!defined('ABSPATH')) exit;

define('VJ_SEO_VERSAO', '1');
define('VJ_SEO_MIN', 3); // mínimo de veículos para existir página de estado/marca

/** Categoria (tipo do coletor) → slug e nomes. */
function vj_seo_tipos() {
    return [
        'carro'    => ['slug' => 'carros',              'nome' => 'Carros e utilitários', 'sing' => 'carro',       'plural' => 'carros'],
        'moto'     => ['slug' => 'motos',               'nome' => 'Motos',                'sing' => 'moto',        'plural' => 'motos'],
        'caminhao' => ['slug' => 'caminhoes',           'nome' => 'Caminhões',            'sing' => 'caminhão',    'plural' => 'caminhões'],
        'onibus'   => ['slug' => 'onibus-e-vans',       'nome' => 'Ônibus e vans',        'sing' => 'ônibus',      'plural' => 'ônibus e vans'],
        'maquina'  => ['slug' => 'tratores-e-maquinas', 'nome' => 'Tratores e máquinas',  'sing' => 'máquina',     'plural' => 'tratores e máquinas'],
        'reboque'  => ['slug' => 'reboques-e-carretas', 'nome' => 'Reboques e carretas',  'sing' => 'reboque',     'plural' => 'reboques e carretas'],
        'nautico'  => ['slug' => 'barcos-e-jet-skis',   'nome' => 'Barcos e jet skis',    'sing' => 'embarcação',  'plural' => 'barcos e jet skis'],
        'aeronave' => ['slug' => 'aeronaves',           'nome' => 'Aeronaves',            'sing' => 'aeronave',    'plural' => 'aeronaves'],
    ];
}

/** Texto de abertura de cada categoria (único por página, bom para busca e para IA). */
function vj_seo_intro_tipo($tipo) {
    $t = [
        'carro'    => 'Carros de passeio, SUVs, picapes e utilitários penhorados em processos judiciais e levados a leilão por leiloeiros oficiais. Na 2ª praça o lance mínimo costuma ficar entre 50% e 60% da avaliação — é onde aparecem as melhores oportunidades.',
        'moto'     => 'Motos de todas as cilindradas vendidas em leilões judiciais: de scooters e motos de entrada a modelos de alta cilindrada. Motos têm custo de transferência baixo, o que torna o custo total da operação bem previsível.',
        'caminhao' => 'Caminhões, cavalos mecânicos e caminhões leves em leilão judicial, muitas vezes vindos de execuções contra transportadoras e empresas. Vale conferir no edital a situação do tacógrafo, do RNTRC e de eventuais débitos.',
        'onibus'   => 'Ônibus, micro-ônibus e vans penhorados em processos judiciais. Boa opção para quem trabalha com fretamento, turismo ou transporte escolar e quer renovar a frota com valor abaixo do mercado.',
        'maquina'  => 'Tratores, retroescavadeiras, empilhadeiras e outras máquinas agrícolas e de construção em leilão judicial. Em máquinas, a visitação e a leitura atenta do edital fazem toda a diferença.',
        'reboque'  => 'Reboques, semirreboques, carretas e implementos rodoviários em leilões judiciais. Muitas vezes são vendidos junto ou separados do cavalo mecânico — o edital informa como está cada lote.',
        'nautico'  => 'Lanchas, barcos, jet skis e outras embarcações em leilão judicial. A documentação é da Marinha (TIE/TIEM), e a transferência segue regras próprias — confira sempre o edital.',
        'aeronave' => 'Aviões, helicópteros e outras aeronaves em leilão judicial. A transferência é feita na ANAC e exige atenção redobrada à documentação e à situação de aeronavegabilidade.',
    ];
    return $t[$tipo] ?? '';
}

function vj_seo_ufs() {
    return [
        'AC' => 'Acre', 'AL' => 'Alagoas', 'AP' => 'Amapá', 'AM' => 'Amazonas', 'BA' => 'Bahia', 'CE' => 'Ceará',
        'DF' => 'Distrito Federal', 'ES' => 'Espírito Santo', 'GO' => 'Goiás', 'MA' => 'Maranhão', 'MT' => 'Mato Grosso',
        'MS' => 'Mato Grosso do Sul', 'MG' => 'Minas Gerais', 'PA' => 'Pará', 'PB' => 'Paraíba', 'PR' => 'Paraná',
        'PE' => 'Pernambuco', 'PI' => 'Piauí', 'RJ' => 'Rio de Janeiro', 'RN' => 'Rio Grande do Norte',
        'RS' => 'Rio Grande do Sul', 'RO' => 'Rondônia', 'RR' => 'Roraima', 'SC' => 'Santa Catarina',
        'SP' => 'São Paulo', 'SE' => 'Sergipe', 'TO' => 'Tocantins',
    ];
}

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */

/** Vitrine pública já preparada: lotes ativos, com hash/slug/URL. */
function vj_seo_dados() {
    static $d = null;
    if ($d !== null) return $d;
    $d = ['gerado' => null, 'lotes' => [], 'por_hash' => []];
    $bruto = function_exists('vj_ler') ? vj_ler('vitrine') : null;
    if (!$bruto) return $d;
    $j = json_decode($bruto, true);
    if (empty($j['lotes'])) return $d;
    $d['gerado'] = $j['geradoEm'] ?? null;
    $d['leiloeiros'] = $j['leiloeiros'] ?? null;
    $agora = time();
    foreach ($j['lotes'] as $l) {
        if (empty($l['id']) || empty($l['titulo'])) continue;
        $l['tipo'] = $l['tipo'] ?: 'carro';
        $l['hash'] = substr(md5($l['id']), 0, 7);
        $l['ts'] = !empty($l['encerra']) ? strtotime($l['encerra']) : null;
        $l['encerrado'] = $l['ts'] && $l['ts'] < $agora;
        $l['url'] = vj_seo_url_lote($l);
        $d['por_hash'][$l['hash']] = $l;
        if (!$l['encerrado']) $d['lotes'][] = $l;
    }
    // Encerra primeiro quem acaba antes; sem data vai pro fim.
    usort($d['lotes'], function ($a, $b) {
        return ($a['ts'] ?: PHP_INT_MAX) <=> ($b['ts'] ?: PHP_INT_MAX);
    });
    return $d;
}

function vj_seo_url_lote($l) {
    $partes = array_filter([$l['titulo'], $l['ano'] ?? null, $l['cidade'] ?? null, $l['uf'] ?? null]);
    $slug = sanitize_title(implode(' ', $partes));
    $slug = trim(substr($slug, 0, 80), '-') ?: 'veiculo';
    return home_url('/veiculo/' . $slug . '-' . $l['hash'] . '/');
}

function vj_seo_url($rota, $a = '', $b = '') {
    $tipos = vj_seo_tipos();
    switch ($rota) {
        case 'hub':    return home_url('/leilao-judicial/');
        case 'tipo':   return home_url('/leilao-judicial/' . $tipos[$a]['slug'] . '/');
        case 'tipouf': return home_url('/leilao-judicial/' . $tipos[$a]['slug'] . '/' . strtolower($b) . '/');
        case 'marca':  return home_url('/leilao-judicial/marca/' . sanitize_title($a) . '/');
        case 'guia':   return home_url('/como-comprar-veiculo-em-leilao-judicial/');
    }
    return home_url('/');
}

function vj_seo_filtrar($f) {
    return array_values(array_filter(vj_seo_dados()['lotes'], function ($l) use ($f) {
        if (!empty($f['tipo']) && $l['tipo'] !== $f['tipo']) return false;
        if (!empty($f['uf']) && ($l['uf'] ?? '') !== $f['uf']) return false;
        if (!empty($f['marca']) && sanitize_title($l['marca'] ?? '') !== $f['marca']) return false;
        return true;
    }));
}

/** Contagens: [tipo => n], [tipo => [uf => n]], [slugMarca => [nome, n]]. */
function vj_seo_contagens() {
    static $c = null;
    if ($c !== null) return $c;
    $c = ['tipo' => [], 'tipouf' => [], 'marca' => [], 'uf' => []];
    foreach (vj_seo_dados()['lotes'] as $l) {
        $c['tipo'][$l['tipo']] = ($c['tipo'][$l['tipo']] ?? 0) + 1;
        if (!empty($l['uf'])) {
            $c['tipouf'][$l['tipo']][$l['uf']] = ($c['tipouf'][$l['tipo']][$l['uf']] ?? 0) + 1;
            $c['uf'][$l['uf']] = ($c['uf'][$l['uf']] ?? 0) + 1;
        }
        if (!empty($l['marca'])) {
            $s = sanitize_title($l['marca']);
            if (!isset($c['marca'][$s])) $c['marca'][$s] = [$l['marca'], 0];
            $c['marca'][$s][1]++;
        }
    }
    uasort($c['marca'], function ($a, $b) { return $b[1] <=> $a[1]; });
    return $c;
}

function vj_seo_preco($l) {
    return $l['segundaPraca'] ?: ($l['lance'] ?: null);
}
function vj_seo_brl($v) {
    return 'R$ ' . number_format((float) $v, 0, ',', '.');
}
function vj_seo_local($l) {
    return !empty($l['cidade']) ? $l['cidade'] . (!empty($l['uf']) ? '/' . $l['uf'] : '') : ($l['uf'] ?? '');
}
/** Lote com 2ª praça cuja 1ª ainda está em andamento (mesma regra do app.js). */
function vj_seo_em_primeira($l) {
    if (empty($l['segundaPraca'])) return false;
    if (!empty($l['fimPraca1'])) return strtotime($l['fimPraca1']) > time();
    return ($l['praca'] ?? null) === 1;
}
function vj_seo_aviso_primeira($l) {
    if (!vj_seo_em_primeira($l)) return '';
    $quando = !empty($l['fimPraca1']) ? ' · o valor da 2ª vale após ' . wp_date('d/m', strtotime($l['fimPraca1'])) : ' · o valor da 2ª vale se não houver lance';
    return '<p class="card__aviso"><b>Em andamento na 1ª praça</b>' . esc_html($quando) . '</p>';
}
function vj_seo_desconto($l) {
    if (!empty($l['segundaPraca']) && !empty($l['lanceInicial']) && $l['lanceInicial'] > $l['segundaPraca']) {
        return (int) round((1 - $l['segundaPraca'] / $l['lanceInicial']) * 100);
    }
    return null;
}

/* ------------------------------------------------------------------ */
/* Rotas                                                               */
/* ------------------------------------------------------------------ */

add_action('init', function () {
    $tipos = implode('|', array_map(function ($t) { return preg_quote($t['slug'], '#'); }, vj_seo_tipos()));
    add_rewrite_rule('^leilao-judicial/?$', 'index.php?vj_rota=hub', 'top');
    add_rewrite_rule('^leilao-judicial/marca/([a-z0-9-]+)/?$', 'index.php?vj_rota=marca&vj_a=$matches[1]', 'top');
    add_rewrite_rule('^leilao-judicial/(' . $tipos . ')/?$', 'index.php?vj_rota=tipo&vj_a=$matches[1]', 'top');
    add_rewrite_rule('^leilao-judicial/(' . $tipos . ')/([a-z]{2})/?$', 'index.php?vj_rota=tipouf&vj_a=$matches[1]&vj_b=$matches[2]', 'top');
    add_rewrite_rule('^veiculo/[a-z0-9-]*?-?([a-f0-9]{7})/?$', 'index.php?vj_rota=veiculo&vj_a=$matches[1]', 'top');
    add_rewrite_rule('^como-comprar-veiculo-em-leilao-judicial/?$', 'index.php?vj_rota=guia', 'top');
    add_rewrite_rule('^llms\.txt$', 'index.php?vj_rota=llms', 'top');

    // Regras novas só valem depois de um flush — feito uma vez por versão.
    if (get_option('vj_seo_versao') !== VJ_SEO_VERSAO) {
        flush_rewrite_rules(false);
        update_option('vj_seo_versao', VJ_SEO_VERSAO, true);
    }
});

// Autocorreção: se algum plugin/painel regravar as regras sem as nossas (aconteceu na troca de
// domínio na Hostinger), as páginas viram 404. Confere a cada carga e regrava se faltar.
add_action('init', function () {
    $regras = get_option('rewrite_rules');
    if (is_array($regras) && $regras && !isset($regras['^leilao-judicial/?$'])) {
        flush_rewrite_rules(false);
        do_action('litespeed_purge_all');
    }
}, 99);

add_filter('query_vars', function ($v) {
    return array_merge($v, ['vj_rota', 'vj_a', 'vj_b']);
});

/** Estado da página atual (resolvido uma vez). null = não é página nossa. */
function vj_seo_pagina() {
    static $p = false;
    if ($p !== false) return $p;
    $rota = get_query_var('vj_rota');
    if (!$rota) return $p = null;
    $a = sanitize_title(get_query_var('vj_a'));
    $b = strtoupper(sanitize_key(get_query_var('vj_b')));
    $tipos = vj_seo_tipos();
    $tipoDeSlug = array_flip(array_map(function ($t) { return $t['slug']; }, $tipos));
    $p = ['rota' => $rota, 'status' => 200, 'noindex' => false];

    if ($rota === 'tipo' || $rota === 'tipouf') {
        if (!isset($tipoDeSlug[$a])) return $p = ['rota' => '404', 'status' => 404, 'noindex' => true];
        $p['tipo'] = $tipoDeSlug[$a];
        if ($rota === 'tipouf') {
            if (!isset(vj_seo_ufs()[$b])) return $p = ['rota' => '404', 'status' => 404, 'noindex' => true];
            $p['uf'] = $b;
        }
        $p['lotes'] = vj_seo_filtrar(['tipo' => $p['tipo'], 'uf' => $p['uf'] ?? '']);
        $p['noindex'] = count($p['lotes']) < ($rota === 'tipouf' ? VJ_SEO_MIN : 1);
    } elseif ($rota === 'marca') {
        $p['lotes'] = vj_seo_filtrar(['marca' => $a]);
        $p['marca'] = $p['lotes'] ? $p['lotes'][0]['marca'] : ucwords(str_replace('-', ' ', $a));
        $p['noindex'] = count($p['lotes']) < VJ_SEO_MIN;
    } elseif ($rota === 'veiculo') {
        $l = vj_seo_dados()['por_hash'][$a] ?? null;
        if (!$l) return $p = ['rota' => 'sumiu', 'status' => 410, 'noindex' => true];
        $p['lote'] = $l;
        $p['noindex'] = $l['encerrado'];
    } elseif (!in_array($rota, ['hub', 'guia', 'llms'], true)) {
        return $p = null;
    }
    return $p;
}

// Página virtual: não é a home, não consulta posts e não cai no 404 do WordPress.
add_action('parse_query', function ($q) {
    if ($q->is_main_query() && $q->get('vj_rota')) {
        $q->is_home = false;
        $q->is_404 = false;
    }
});
add_filter('posts_pre_query', function ($posts, $q) {
    return ($q->is_main_query() && $q->get('vj_rota')) ? [] : $posts;
}, 10, 2);
add_filter('pre_handle_404', function ($pre, $q) {
    return $q->get('vj_rota') ? true : $pre;
}, 10, 2);

// Sem isso o WordPress manda /llms.txt para /llms.txt/ (barra no fim).
add_filter('redirect_canonical', function ($url) {
    return get_query_var('vj_rota') ? false : $url;
});

add_action('template_redirect', function () {
    $p = vj_seo_pagina();
    if (!$p) return;
    if ($p['rota'] === 'llms') {
        header('Content-Type: text/plain; charset=utf-8');
        echo vj_seo_llms_txt();
        exit;
    }
    // URL de veículo com slug antigo/errado → 301 pro endereço certo.
    if ($p['rota'] === 'veiculo') {
        $certo = $p['lote']['url'];
        $atual = strtok($_SERVER['REQUEST_URI'] ?? '', '?');
        if (untrailingslashit($atual) !== untrailingslashit(wp_parse_url($certo, PHP_URL_PATH))) {
            wp_safe_redirect($certo, 301);
            exit;
        }
    }
    status_header($p['status']);
    if ($p['status'] === 404) {
        global $wp_query;
        $wp_query->set_404();
    }
});

add_filter('template_include', function ($t) {
    $p = vj_seo_pagina();
    if (!$p || $p['rota'] === '404') return $t;
    return get_theme_file_path('template-seo.php');
});

/* ------------------------------------------------------------------ */
/* <head>: título, descrição, canonical, Open Graph, dados estruturados */
/* ------------------------------------------------------------------ */

/** Título + descrição + canonical + imagem da página atual (nossa ou do tema). */
function vj_seo_meta() {
    static $m = null;
    if ($m !== null) return $m;
    $p = vj_seo_pagina();
    $tipos = vj_seo_tipos();
    $ufs = vj_seo_ufs();
    $img = vj_seo_og_padrao(); // capa da marca (1200×630); veículo e página do Rubens trocam abaixo
    $m = null;

    if ($p) {
        $n = isset($p['lotes']) ? count($p['lotes']) : 0;
        switch ($p['rota']) {
            case 'hub':
                $total = count(vj_seo_dados()['lotes']);
                $m = ['Leilão judicial de veículos: carros, motos, caminhões e mais', "$total veículos em leilões judiciais de todo o Brasil, organizados por categoria, estado e marca. Valores da 2ª praça, datas e fotos, atualizados todos os dias.", vj_seo_url('hub')];
                break;
            case 'tipo':
                $t = $tipos[$p['tipo']];
                $m = [$t['nome'] . ' em leilão judicial', ($n ? "$n {$t['plural']} em leilões judiciais agora" : ucfirst($t['plural']) . ' em leilões judiciais') . ', com valor da 2ª praça, cidade e data de encerramento. Atualizado todos os dias com os principais leiloeiros oficiais.', vj_seo_url('tipo', $p['tipo'])];
                break;
            case 'tipouf':
                $t = $tipos[$p['tipo']];
                $e = $ufs[$p['uf']];
                $m = [$t['nome'] . ' em leilão judicial em ' . $e . ' (' . $p['uf'] . ')', "$n {$t['plural']} em leilões judiciais em $e, com valor da 2ª praça e data de encerramento. Atualizado diariamente.", vj_seo_url('tipouf', $p['tipo'], $p['uf'])];
                break;
            case 'marca':
                $m = [$p['marca'] . ' em leilão judicial', "$n veículos {$p['marca']} em leilões judiciais: modelos, anos, cidades e valores da 2ª praça. Atualizado todos os dias.", vj_seo_url('marca', $p['marca'])];
                break;
            case 'veiculo':
                $l = $p['lote'];
                $nome = trim($l['titulo'] . ' ' . ($l['ano'] ?? ''));
                $pr = vj_seo_preco($l);
                $desc = $nome . ' em leilão judicial' . (vj_seo_local($l) ? ' em ' . vj_seo_local($l) : '') . ($pr ? ', ' . (!empty($l['segundaPraca']) ? '2ª praça' : 'lance') . ' ' . vj_seo_brl($pr) : '') . ($l['ts'] ? '. Encerra em ' . wp_date('d/m/Y', $l['ts']) : '') . '. Veja o custo total da arrematação com a assessoria do Dr. Rubens.';
                $m = [$nome . ' — leilão judicial' . (vj_seo_local($l) ? ' em ' . vj_seo_local($l) : ''), $desc, $l['url']];
                if (!empty($l['imagem'])) $img = $l['imagem'];
                break;
            case 'guia':
                $m = ['Como comprar veículo em leilão judicial: guia, custos e dúvidas', 'Passo a passo para arrematar carro, moto ou caminhão em leilão judicial: 1ª e 2ª praça, comissão do leiloeiro, custos da arrematação, carta de arrematação e transferência.', vj_seo_url('guia')];
                break;
            case 'sumiu':
                $m = ['Este leilão já saiu da vitrine', 'O veículo que você procurou já foi arrematado ou encerrado. Veja outros veículos em leilão judicial.', ''];
                break;
        }
    } elseif (is_front_page()) {
        $m = [VJ_MARCA . ' — veículos de leilão judicial num só lugar', 'Carros, motos, caminhões, tratores e outros veículos em leilões judiciais dos principais leiloeiros oficiais do Brasil, reunidos e filtráveis. Custo total da arrematação e assessoria do Dr. Rubens.', home_url('/')];
    } elseif (function_exists('vj_eh_pagina_rubens') && vj_eh_pagina_rubens()) {
        $m = ['Dr. Rubens Filippe de Jesus — advogado especialista em leilões', 'Conheça o Dr. Rubens Filippe de Jesus, advogado membro da Comissão Especial de Leilões da OAB-SP, que assessora a compra de veículos em leilões judiciais.', vj_url_rubens()];
        $img = vj_asset('rubens/retrato.jpg');
    }
    if ($m) $m = ['titulo' => $m[0], 'desc' => $m[1], 'url' => $m[2], 'img' => $img];
    return $m;
}

/** Imagem padrão dos links compartilhados (WhatsApp, Facebook, LinkedIn…). Feita a partir de Arquivos/Capa Google.jpeg. */
function vj_seo_og_padrao() {
    return vj_asset('og-capa.jpg');
}

add_filter('pre_get_document_title', function ($t) {
    $m = vj_seo_meta();
    if (!$m) return $t;
    return is_front_page() ? $m['titulo'] : $m['titulo'] . ' | ' . VJ_MARCA;
});

add_filter('wp_robots', function ($r) {
    $p = vj_seo_pagina();
    if ($p && $p['noindex']) $r['noindex'] = true;
    if (!$p || !$p['noindex']) $r['max-image-preview'] = 'large';
    return $r;
});

// O WordPress só imprime canonical em posts/páginas; nas nossas rotas fazemos nós.
add_action('wp_head', function () {
    $m = vj_seo_meta();
    if (!$m) return;
    $p = vj_seo_pagina();
    echo '<meta name="description" content="' . esc_attr($m['desc']) . '" />' . "\n";
    if ($m['url'] && (($p && !$p['noindex']) || (!$p && is_front_page()))) echo '<link rel="canonical" href="' . esc_url($m['url']) . '" />' . "\n";
    $og = [
        'og:type' => ($p && $p['rota'] === 'veiculo') ? 'product' : 'website',
        'og:site_name' => VJ_MARCA,
        'og:locale' => 'pt_BR',
        'og:title' => $m['titulo'],
        'og:description' => $m['desc'],
        'og:url' => $m['url'] ?: home_url('/'),
        'og:image' => $m['img'],
    ];
    if ($m['img'] === vj_seo_og_padrao()) {
        $og += ['og:image:width' => '1200', 'og:image:height' => '630', 'og:image:alt' => VJ_MARCA . ' — plataforma online de leilões judiciais de veículos'];
    }
    foreach ($og as $k => $v) echo '<meta property="' . esc_attr($k) . '" content="' . esc_attr($v) . '" />' . "\n";
    echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
    foreach (vj_seo_schemas() as $s) {
        echo '<script type="application/ld+json">' . wp_json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n";
    }
}, 2);

// A descrição da home saía fixa no functions.php; agora vem daqui.
remove_action('wp_head', 'rel_canonical');
add_action('wp_head', function () {
    if (!vj_seo_pagina()) rel_canonical();
}, 3);

function vj_seo_org() {
    $c = vj_tema_config();
    return [
        '@type' => 'Organization',
        '@id' => home_url('/#org'),
        'name' => VJ_MARCA,
        'url' => home_url('/'),
        'logo' => vj_asset('rubens/avatar.jpg'),
        'sameAs' => ['https://www.instagram.com/' . ltrim((string) $c['instagram'], '@') . '/'],
        'founder' => ['@id' => home_url('/#rubens')],
        'contactPoint' => ['@type' => 'ContactPoint', 'contactType' => 'customer service', 'telephone' => '+' . preg_replace('/\D+/', '', $c['whatsapp']), 'availableLanguage' => 'Portuguese'],
    ];
}

function vj_seo_rubens() {
    $c = vj_tema_config();
    return [
        '@type' => 'Person',
        '@id' => home_url('/#rubens'),
        'name' => 'Rubens Filippe de Jesus',
        'honorificPrefix' => 'Dr.',
        'jobTitle' => 'Advogado especialista em leilões',
        'url' => vj_url_rubens(),
        'image' => vj_asset('rubens/retrato.jpg'),
        'sameAs' => ['https://www.instagram.com/' . ltrim((string) $c['instagram'], '@') . '/'],
        'memberOf' => ['@type' => 'Organization', 'name' => 'Comissão Especial de Leilões da OAB-SP'],
        'knowsAbout' => ['Leilão judicial', 'Arrematação de veículos', 'Direito processual civil', 'Carta de arrematação'],
        'worksFor' => ['@id' => home_url('/#org')],
    ];
}

function vj_seo_breadcrumb($itens) {
    $lista = [];
    foreach ($itens as $i => $it) {
        $lista[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $it[0], 'item' => $it[1]];
    }
    return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $lista];
}

/** Migalhas da página atual: [[nome, url], …]. */
function vj_seo_migalhas() {
    $p = vj_seo_pagina();
    if (!$p) return [];
    $tipos = vj_seo_tipos();
    $m = [['Início', home_url('/')], ['Leilão judicial', vj_seo_url('hub')]];
    switch ($p['rota']) {
        case 'tipo':   $m[] = [$tipos[$p['tipo']]['nome'], vj_seo_url('tipo', $p['tipo'])]; break;
        case 'tipouf': $m[] = [$tipos[$p['tipo']]['nome'], vj_seo_url('tipo', $p['tipo'])]; $m[] = [vj_seo_ufs()[$p['uf']], vj_seo_url('tipouf', $p['tipo'], $p['uf'])]; break;
        case 'marca':  $m[] = [$p['marca'], vj_seo_url('marca', $p['marca'])]; break;
        case 'veiculo':
            $l = $p['lote'];
            $m[] = [$tipos[$l['tipo']]['nome'] ?? 'Veículos', vj_seo_url('tipo', $l['tipo'])];
            if (!empty($l['uf']) && (vj_seo_contagens()['tipouf'][$l['tipo']][$l['uf']] ?? 0) >= VJ_SEO_MIN) {
                $m[] = [vj_seo_ufs()[$l['uf']] ?? $l['uf'], vj_seo_url('tipouf', $l['tipo'], $l['uf'])];
            }
            $m[] = [$l['titulo'], $l['url']];
            break;
        case 'guia': $m = [['Início', home_url('/')], ['Como comprar em leilão judicial', vj_seo_url('guia')]]; break;
        case 'hub': break;
        default: return [];
    }
    return $m;
}

function vj_seo_schemas() {
    $p = vj_seo_pagina();
    $s = [];
    if (is_front_page()) {
        $s[] = ['@context' => 'https://schema.org', '@graph' => [
            vj_seo_org(),
            vj_seo_rubens(),
            ['@type' => 'WebSite', '@id' => home_url('/#site'), 'name' => VJ_MARCA, 'url' => home_url('/'), 'inLanguage' => 'pt-BR', 'publisher' => ['@id' => home_url('/#org')],
             'potentialAction' => ['@type' => 'SearchAction', 'target' => ['@type' => 'EntryPoint', 'urlTemplate' => home_url('/?q={q}')], 'query-input' => 'required name=q']],
        ]];
    } elseif (function_exists('vj_eh_pagina_rubens') && vj_eh_pagina_rubens()) {
        $s[] = ['@context' => 'https://schema.org', '@graph' => [
            ['@type' => 'ProfilePage', 'url' => vj_url_rubens(), 'mainEntity' => ['@id' => home_url('/#rubens')]],
            vj_seo_rubens(),
            vj_seo_org(),
        ]];
    }
    if (!$p || $p['noindex']) return $s;

    if ($mig = vj_seo_migalhas()) $s[] = vj_seo_breadcrumb($mig);

    if (!empty($p['lotes'])) {
        $itens = [];
        foreach (array_slice($p['lotes'], 0, 30) as $i => $l) {
            $itens[] = ['@type' => 'ListItem', 'position' => $i + 1, 'url' => $l['url'], 'name' => trim($l['titulo'] . ' ' . ($l['ano'] ?? ''))];
        }
        $s[] = ['@context' => 'https://schema.org', '@type' => 'ItemList', 'numberOfItems' => count($p['lotes']), 'itemListElement' => $itens];
    }
    if ($p['rota'] === 'veiculo') {
        $l = $p['lote'];
        $pr = vj_seo_preco($l);
        $v = [
            '@context' => 'https://schema.org',
            '@type' => 'Vehicle',
            'name' => trim($l['titulo'] . ' ' . ($l['ano'] ?? '')),
            'url' => $l['url'],
            'description' => vj_seo_meta()['desc'],
            'itemCondition' => 'https://schema.org/UsedCondition',
        ];
        if (!empty($l['imagem'])) $v['image'] = $l['imagem'];
        if (!empty($l['marca'])) $v['brand'] = ['@type' => 'Brand', 'name' => $l['marca']];
        if (!empty($l['ano'])) $v['vehicleModelDate'] = (string) $l['ano'];
        if (!empty($l['km'])) $v['mileageFromOdometer'] = ['@type' => 'QuantitativeValue', 'value' => (int) $l['km'], 'unitCode' => 'KMT'];
        if ($pr) {
            $v['offers'] = [
                '@type' => 'Offer',
                'price' => (float) $pr,
                'priceCurrency' => 'BRL',
                'availability' => 'https://schema.org/InStock',
                'url' => $l['url'],
                'seller' => ['@type' => 'Organization', 'name' => 'Leiloeiro oficial (leilão judicial)'],
            ];
            if ($l['ts']) $v['offers']['priceValidUntil'] = wp_date('Y-m-d', $l['ts']);
            if (!empty($l['cidade'])) $v['offers']['availableAtOrFrom'] = ['@type' => 'Place', 'address' => ['@type' => 'PostalAddress', 'addressLocality' => $l['cidade'], 'addressRegion' => $l['uf'] ?? '', 'addressCountry' => 'BR']];
        }
        $s[] = $v;
    }
    if ($p['rota'] === 'guia') {
        $faq = [];
        foreach (vj_seo_faq() as $q) {
            $faq[] = ['@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => wp_strip_all_tags($q[1])]];
        }
        $s[] = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $faq];
        $s[] = ['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => vj_seo_meta()['titulo'], 'inLanguage' => 'pt-BR',
                'author' => vj_seo_org(), 'publisher' => vj_seo_org(), 'mainEntityOfPage' => vj_seo_url('guia'),
                'dateModified' => wp_date('c', filemtime(__FILE__))];
    }
    return $s;
}

/* ------------------------------------------------------------------ */
/* Guia / perguntas frequentes                                         */
/* ------------------------------------------------------------------ */

/** Custos da operação a partir das configurações do plugin. */
function vj_seo_custos() {
    $c = vj_tema_config();
    return [
        'comissao' => rtrim(rtrim(number_format((float) $c['comissao_pct'], 2, ',', ''), '0'), ','),
        'oficial' => vj_seo_brl($c['oficial_justica']),
        'carta' => vj_seo_brl($c['carta_arrematacao']),
        'transf' => vj_seo_brl($c['transferencia']),
        'consultoria' => vj_seo_brl($c['consultoria']),
        'bruto' => $c,
    ];
}

/** Exemplo numérico do custo total (usado no guia e no llms.txt). */
function vj_seo_exemplo($lance = 30000) {
    $c = vj_seo_custos()['bruto'];
    $com = $lance * ((float) $c['comissao_pct']) / 100;
    $total = $lance + $com + $c['oficial_justica'] + $c['carta_arrematacao'] + $c['transferencia'] + $c['consultoria'];
    return ['lance' => $lance, 'comissao' => $com, 'total' => $total];
}

/** [pergunta, resposta em HTML simples]. */
function vj_seo_faq() {
    $k = vj_seo_custos();
    $ex = vj_seo_exemplo();
    return [
        ['O que é um leilão judicial de veículos?',
         'É a venda pública de um veículo penhorado em um processo na Justiça, determinada pelo juiz para pagar uma dívida. Quem conduz é um leiloeiro oficial, matriculado na Junta Comercial, e todas as regras ficam no edital do leilão. Hoje quase todos acontecem pela internet.'],
        ['Qual a diferença entre leilão judicial e extrajudicial?',
         'No judicial, a venda é ordenada por um juiz dentro de um processo e segue o Código de Processo Civil. No extrajudicial, quem vende é um banco, financeira, seguradora ou empresa, sem processo judicial. O ' . esc_html(VJ_MARCA) . ' reúne apenas leilões judiciais.'],
        ['O que são a 1ª e a 2ª praça?',
         'Na 1ª praça (1º leilão) o lance mínimo é o valor de avaliação do veículo. Se ninguém der lance, acontece a 2ª praça (2º leilão), em que o juiz aceita lances menores, respeitando um mínimo — pelo Código de Processo Civil (art. 891), se o juiz não fixar outro valor, não se aceita lance inferior a 50% da avaliação. Por isso o ' . esc_html(VJ_MARCA) . ' mostra sempre o valor da 2ª praça.'],
        ['Quanto custa arrematar um veículo além do lance?',
         'Além do lance, entram: a comissão do leiloeiro (normalmente ' . $k['comissao'] . '% sobre o valor arrematado, ou a que o edital indicar), cerca de ' . $k['oficial'] . ' de condução do oficial de justiça, ' . $k['carta'] . ' para a expedição da carta de arrematação e aproximadamente ' . $k['transf'] . ' de transferência no Detran. Com a assessoria jurídica (' . $k['consultoria'] . ' na primeira consultoria), um lance de ' . vj_seo_brl($ex['lance']) . ' resulta em um custo total de cerca de ' . vj_seo_brl($ex['total']) . '.'],
        ['Quem paga a comissão do leiloeiro?',
         'O arrematante. A comissão é paga à parte, além do lance, e normalmente é de ' . $k['comissao'] . '% sobre o valor da arrematação. O percentual exato está no edital.'],
        ['Posso parcelar o lance?',
         'O Código de Processo Civil (art. 895) permite apresentar proposta de pagamento parcelado, com pelo menos 25% à vista e o restante em até 30 meses, garantido pelo próprio bem. Mas a proposta depende do que o edital e o juiz admitirem — muitos leilões exigem pagamento à vista.'],
        ['E os débitos de IPVA, multas e licenciamento?',
         'Depende do edital. Muitos editais informam que o veículo é vendido livre dos débitos anteriores à arrematação, que são pagos com o próprio valor arrecadado; outros deixam débitos a cargo do comprador. Ler o edital com atenção — e consultar um advogado — evita surpresas.'],
        ['Como participo de um leilão judicial?',
         'Você se cadastra no site do leiloeiro responsável, envia os documentos pedidos para habilitação e, depois de aprovado, dá lances pela internet até o encerramento. Assinantes do ' . esc_html(VJ_MARCA) . ' veem o link direto de cada anúncio e o custo total calculado.'],
        ['Arrematei. E agora?',
         'Você paga o lance e a comissão no prazo do edital (em geral 24 horas). O juiz homologa a arrematação, é expedida a carta de arrematação e, com ela, é feita a entrega do veículo (muitas vezes por meio de oficial de justiça) e a transferência para o seu nome no Detran.'],
        ['Posso ver o veículo antes de dar lance?',
         'Alguns leilões permitem visitação em datas marcadas; outros não. O edital informa onde o veículo está e se há visitação. Nas fotos e na descrição do anúncio também costumam constar o estado de conservação e se o veículo funciona.'],
        ['Leilão judicial é seguro?',
         'É um processo público e fiscalizado pelo juiz, conduzido por leiloeiro oficial. Os riscos estão nos detalhes: débitos, estado do veículo, prazos para contestação da arrematação e documentação. Por isso a análise do edital e do processo por um advogado especializado é o que dá segurança à compra.'],
        ['Com que frequência o ' . VJ_MARCA . ' é atualizado?',
         'Todos os dias, às 6h da manhã (horário de Brasília). O site consulta os principais leiloeiros oficiais do Brasil e reúne carros, motos, caminhões, ônibus, máquinas, reboques, barcos e aeronaves em leilão judicial.'],
    ];
}

/* ------------------------------------------------------------------ */
/* Sitemap                                                             */
/* ------------------------------------------------------------------ */

add_action('init', function () {
    if (!class_exists('WP_Sitemaps_Provider')) return;

    if (!class_exists('VJ_Sitemap_Provider')) {
    class VJ_Sitemap_Provider extends WP_Sitemaps_Provider {
        const POR_PAGINA = 1000;
        public function __construct() { $this->name = 'vj'; $this->object_type = 'vj'; }
        public function get_object_subtypes() { return ['paginas' => (object) ['name' => 'paginas'], 'veiculos' => (object) ['name' => 'veiculos']]; }
        public function get_max_num_pages($sub = '') {
            if ($sub === 'veiculos') return max(1, (int) ceil(count(vj_seo_dados()['lotes']) / self::POR_PAGINA));
            return 1;
        }
        public function get_url_list($pag, $sub = '') {
            $d = vj_seo_dados();
            $mod = $d['gerado'] ? gmdate('c', strtotime($d['gerado'])) : null;
            $u = function ($loc) use ($mod) { return $mod ? ['loc' => $loc, 'lastmod' => $mod] : ['loc' => $loc]; };
            if ($sub === 'veiculos') {
                return array_map(function ($l) use ($u) { return $u($l['url']); }, array_slice($d['lotes'], ($pag - 1) * self::POR_PAGINA, self::POR_PAGINA));
            }
            $c = vj_seo_contagens();
            $lista = [$u(vj_seo_url('hub')), ['loc' => vj_seo_url('guia'), 'lastmod' => gmdate('c', filemtime(__FILE__))]];
            foreach (array_keys(vj_seo_tipos()) as $t) {
                if (empty($c['tipo'][$t])) continue;
                $lista[] = $u(vj_seo_url('tipo', $t));
                foreach ($c['tipouf'][$t] ?? [] as $uf => $n) if ($n >= VJ_SEO_MIN && isset(vj_seo_ufs()[$uf])) $lista[] = $u(vj_seo_url('tipouf', $t, $uf));
            }
            foreach ($c['marca'] as $slug => $mn) if ($mn[1] >= VJ_SEO_MIN) $lista[] = $u(vj_seo_url('marca', $mn[0]));
            return $lista;
        }
    }
    }
    wp_register_sitemap_provider('vj', new VJ_Sitemap_Provider());
}, 5);

// Sitemap de usuários expõe o login do administrador; categorias de blog não existem aqui.
add_filter('wp_sitemaps_add_provider', function ($p, $nome) {
    return in_array($nome, ['users', 'taxonomies'], true) ? false : $p;
}, 10, 2);
add_filter('wp_sitemaps_post_types', function ($tipos) {
    unset($tipos['post']);
    return $tipos;
});

/* ------------------------------------------------------------------ */
/* llms.txt                                                            */
/* ------------------------------------------------------------------ */

function vj_seo_llms_txt() {
    $d = vj_seo_dados();
    $c = vj_seo_contagens();
    $k = vj_seo_custos();
    $ex = vj_seo_exemplo();
    $tipos = vj_seo_tipos();
    $o = '# ' . VJ_MARCA . "\n\n";
    $o .= '> Agregador de veículos em leilão JUDICIAL no Brasil (carros, motos, caminhões, ônibus, máquinas, reboques, barcos e aeronaves), atualizado todos os dias às 6h (Brasília), com curadoria e assessoria jurídica do Dr. Rubens Filippe de Jesus, advogado membro da Comissão Especial de Leilões da OAB-SP.' . "\n\n";
    $o .= 'Hoje: ' . count($d['lotes']) . ' veículos ativos' . (!empty($d['leiloeiros']) ? ' de ' . (int) $d['leiloeiros'] . ' leiloeiros oficiais' : '') . ($d['gerado'] ? ' (coleta de ' . wp_date('d/m/Y', strtotime($d['gerado'])) . ')' : '') . ". O valor exibido é o da 2ª praça (2º leilão); quando não há 2ª praça, é o lance da praça única.\n\n";
    $o .= "Custo total estimado de uma arrematação = lance + comissão do leiloeiro ({$k['comissao']}% ou a do edital) + {$k['oficial']} (condução do oficial de justiça) + {$k['carta']} (carta de arrematação) + ~{$k['transf']} (transferência) + {$k['consultoria']} (primeira consultoria jurídica). Exemplo: lance de " . vj_seo_brl($ex['lance']) . ' → custo total ≈ ' . vj_seo_brl($ex['total']) . ".\n\n";
    $o .= "## Páginas principais\n\n";
    $o .= '- [Como comprar veículo em leilão judicial](' . vj_seo_url('guia') . "): guia, custos e perguntas frequentes\n";
    $o .= '- [Todos os veículos por categoria, estado e marca](' . vj_seo_url('hub') . ")\n";
    $o .= '- [Quem é o Dr. Rubens Filippe de Jesus](' . vj_url_rubens() . ")\n";
    $o .= '- [Busca completa com filtros](' . home_url('/') . ")\n\n";
    $o .= "## Categorias\n\n";
    foreach ($tipos as $t => $info) {
        if (!empty($c['tipo'][$t])) $o .= '- [' . $info['nome'] . ' em leilão judicial](' . vj_seo_url('tipo', $t) . '): ' . $c['tipo'][$t] . ($c['tipo'][$t] === 1 ? ' veículo' : ' veículos') . "\n";
    }
    $o .= "\n## Perguntas frequentes\n\n";
    foreach (vj_seo_faq() as $q) $o .= '### ' . $q[0] . "\n\n" . wp_strip_all_tags($q[1]) . "\n\n";
    $o .= "## Contato\n\n- WhatsApp: +" . preg_replace('/\D+/', '', vj_tema_config()['whatsapp']) . "\n- Instagram: https://www.instagram.com/" . ltrim((string) vj_tema_config()['instagram'], '@') . "/\n";
    return $o;
}

/* ------------------------------------------------------------------ */
/* Peças de HTML usadas pelo template                                  */
/* ------------------------------------------------------------------ */

function vj_seo_card($l) {
    $tipos = vj_seo_tipos();
    $pr = vj_seo_preco($l);
    $desc = vj_seo_desconto($l);
    $specs = array_filter([$l['tipo'] !== 'carro' ? ucfirst($tipos[$l['tipo']]['sing'] ?? '') : null, $l['ano'] ?? null, !empty($l['km']) ? number_format((int) $l['km'], 0, ',', '.') . ' km' : null, vj_seo_local($l)]);
    ob_start(); ?>
    <article class="card">
      <a class="card__foto <?php echo empty($l['imagem']) ? 'sem' : 'ok'; ?>" href="<?php echo esc_url($l['url']); ?>" tabindex="-1" aria-hidden="true">
        <?php if (!empty($l['imagem'])) : ?><img src="<?php echo esc_url($l['imagem']); ?>" alt="<?php echo esc_attr($l['titulo']); ?>" loading="lazy" decoding="async" referrerpolicy="no-referrer" /><?php endif; ?>
        <?php if ($l['ts']) : ?><span class="card__tempo">encerra <?php echo esc_html(wp_date('d/m', $l['ts'])); ?></span><?php endif; ?>
      </a>
      <div class="card__corpo">
        <h3 class="card__titulo"><a href="<?php echo esc_url($l['url']); ?>"><?php echo esc_html($l['titulo']); ?></a></h3>
        <p class="card__specs"><?php foreach ($specs as $s) echo '<span>' . esc_html($s) . '</span>'; ?></p>
        <?php echo vj_seo_aviso_primeira($l); ?>
        <div class="card__preco">
          <span class="card__rotulo"><?php echo !empty($l['segundaPraca']) ? '2ª praça' : 'Praça única'; ?></span>
          <?php if ($pr) : ?><strong class="card__valor"><?php echo esc_html(vj_seo_brl($pr)); ?></strong><?php else : ?><strong class="card__valor sem">Ver edital</strong><?php endif; ?>
          <?php if ($desc) : ?><span class="card__fipe">−<?php echo (int) $desc; ?>% da 1ª praça</span><?php endif; ?>
        </div>
      </div>
    </article>
    <?php
    return ob_get_clean();
}

function vj_seo_html_migalhas() {
    $m = vj_seo_migalhas();
    if (count($m) < 2) return '';
    $out = [];
    foreach ($m as $i => $it) {
        $out[] = $i === count($m) - 1 ? '<span aria-current="page">' . esc_html($it[0]) . '</span>' : '<a href="' . esc_url($it[1]) . '">' . esc_html($it[0]) . '</a>';
    }
    return '<nav class="migalhas" aria-label="Você está em">' . implode('<span aria-hidden="true">/</span>', $out) . '</nav>';
}

/** Blocos de links para as categorias/estados/marcas (usado no hub e no rodapé). */
function vj_seo_links_tipos($comContagem = true) {
    $c = vj_seo_contagens();
    $out = '';
    foreach (vj_seo_tipos() as $t => $info) {
        $n = $c['tipo'][$t] ?? 0;
        if (!$n) continue;
        $out .= '<a class="chip" href="' . esc_url(vj_seo_url('tipo', $t)) . '">' . esc_html($info['nome']) . ($comContagem ? ' <small>' . (int) $n . '</small>' : '') . '</a>';
    }
    return $out;
}
