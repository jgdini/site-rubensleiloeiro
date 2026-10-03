<?php
/* Páginas geradas pelo inc/seo.php (categorias, estados, marcas, veículo, guia). HTML puro, legível pelo Google e por IAs. */
if (!defined('ABSPATH')) exit;
$p = vj_seo_pagina();
$m = vj_seo_meta();
$tipos = vj_seo_tipos();
$ufs = vj_seo_ufs();
$c = vj_seo_contagens();
$d = vj_seo_dados();
$vj = vj_tema_config();
$wpp_txt = 'Olá ' . $vj['nome_contato'] . '! Vi o site ' . VJ_MARCA . ' e gostaria de uma consultoria para arrematar um veículo em leilão judicial.';
$atualizado = $d['gerado'] ? wp_date('d/m/Y', strtotime($d['gerado'])) : '';
get_header();
?>
<main class="wrap seo">
  <?php echo vj_seo_html_migalhas(); ?>

<?php if ($p['rota'] === 'veiculo') :
    $l = $p['lote'];
    $pr = vj_seo_preco($l);
    $desc = vj_seo_desconto($l);
    $nome = trim($l['titulo'] . ' ' . ($l['ano'] ?? ''));
    $busca = add_query_arg('q', rawurlencode($l['titulo']), home_url('/'));
    $parecidos = array_slice(array_values(array_filter(vj_seo_filtrar(['tipo' => $l['tipo']]), function ($o) use ($l) {
        return $o['hash'] !== $l['hash'] && (($o['uf'] ?? '') === ($l['uf'] ?? '') || ($o['marca'] ?? '') === ($l['marca'] ?? ''));
    })), 0, 8);
    $wpp_txt = 'Olá ' . $vj['nome_contato'] . '! Vi no ' . VJ_MARCA . ' o ' . $nome . ' (' . vj_seo_local($l) . ') e gostaria de uma consultoria para arrematar.';
?>
  <article class="lote">
    <div class="lote__foto card__foto <?php echo empty($l['imagem']) ? 'sem' : 'ok'; ?>">
      <?php if (!empty($l['imagem'])) : ?><img src="<?php echo esc_url($l['imagem']); ?>" alt="<?php echo esc_attr($nome); ?>" referrerpolicy="no-referrer" fetchpriority="high" /><?php endif; ?>
    </div>
    <div class="lote__info">
      <p class="hero__eyebrow">Leilão judicial · <?php echo esc_html($tipos[$l['tipo']]['nome'] ?? 'Veículo'); ?></p>
      <h1><?php echo esc_html($nome); ?></h1>
      <?php if ($l['encerrado']) : ?><p class="lote__aviso">Este leilão já foi encerrado.</p><?php endif; ?>
      <dl class="lote__dados">
        <?php if (!empty($l['marca'])) : ?><div><dt>Marca</dt><dd><a href="<?php echo esc_url(vj_seo_url('marca', $l['marca'])); ?>"><?php echo esc_html($l['marca']); ?></a></dd></div><?php endif; ?>
        <?php if (!empty($l['ano'])) : ?><div><dt>Ano</dt><dd><?php echo (int) $l['ano']; ?></dd></div><?php endif; ?>
        <?php if (!empty($l['km'])) : ?><div><dt>Quilometragem</dt><dd><?php echo esc_html(number_format((int) $l['km'], 0, ',', '.')); ?> km</dd></div><?php endif; ?>
        <?php if (vj_seo_local($l)) : ?><div><dt>Local</dt><dd><?php echo esc_html(vj_seo_local($l)); ?></dd></div><?php endif; ?>
        <?php if ($l['ts']) : ?><div><dt>Encerramento</dt><dd><?php echo esc_html(wp_date('d/m/Y \à\s H\hi', $l['ts'])); ?></dd></div><?php endif; ?>
        <?php if (!empty($l['lanceInicial']) && !empty($l['segundaPraca']) && $l['lanceInicial'] > $l['segundaPraca']) : ?><div><dt>1ª praça (avaliação)</dt><dd><?php echo esc_html(vj_seo_brl($l['lanceInicial'])); ?></dd></div><?php endif; ?>
        <div><dt>Natureza</dt><dd>Judicial</dd></div>
      </dl>
      <?php echo vj_seo_aviso_primeira($l); ?>
      <div class="lote__preco">
        <span class="card__rotulo"><?php echo !empty($l['segundaPraca']) ? 'Lance mínimo na 2ª praça' : 'Lance mínimo (praça única)'; ?></span>
        <strong><?php echo $pr ? esc_html(vj_seo_brl($pr)) : 'Ver edital'; ?></strong>
        <?php if ($desc) : ?><span class="card__fipe"><?php echo (int) $desc; ?>% abaixo da 1ª praça</span><?php endif; ?>
      </div>
      <div class="card__total lote__total">
        <span class="card__total-rot">Custo total da arrematação</span>
        <span class="borrado">R$ 00.000</span>
        <span class="cadeado"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> exclusivo para assinantes</span>
      </div>
      <div class="lote__acoes">
        <a class="btn btn--primario" href="<?php echo esc_url($busca); ?>">Ver link do leilão e custo total</a>
        <a class="btn btn--wpp" target="_blank" rel="noopener" href="<?php echo esc_url(vj_link_whats($wpp_txt)); ?>">Falar com o <?php echo esc_html($vj['nome_contato']); ?></a>
      </div>
      <p class="lote__nota">O link do anúncio original, o leiloeiro, o processo e o custo total (comissão, oficial de justiça, carta de arrematação e transferência) ficam disponíveis para assinantes. Valores e datas podem mudar — confira sempre o edital.</p>
    </div>
  </article>
  <?php if ($parecidos) : ?>
    <section class="seo__bloco">
      <h2>Outros <?php echo esc_html($tipos[$l['tipo']]['plural']); ?> em leilão judicial</h2>
      <div class="grade"><?php foreach ($parecidos as $o) echo vj_seo_card($o); ?></div>
      <p><a class="link-ouro" href="<?php echo esc_url(vj_seo_url('tipo', $l['tipo'])); ?>">Ver todos os <?php echo esc_html($tipos[$l['tipo']]['plural']); ?> →</a></p>
    </section>
  <?php endif; ?>

<?php elseif ($p['rota'] === 'guia') :
    $k = vj_seo_custos();
    $ex = vj_seo_exemplo();
?>
  <header class="seo__topo">
    <p class="hero__eyebrow">Guia · <?php echo esc_html(VJ_MARCA); ?></p>
    <h1>Como comprar veículo em leilão judicial</h1>
    <p class="seo__intro">Um leilão judicial pode ser a forma mais barata de comprar um carro, uma moto ou um caminhão — desde que você saiba o que está comprando e quanto vai pagar no fim. Este guia resume o caminho, os custos reais e as dúvidas mais comuns.</p>
  </header>

  <section class="seo__bloco guia">
    <h2>Passo a passo</h2>
    <ol class="passos">
      <li><b>Encontre o veículo.</b> Use a <a href="<?php echo esc_url(home_url('/')); ?>">busca do <?php echo esc_html(VJ_MARCA); ?></a> ou navegue por <a href="<?php echo esc_url(vj_seo_url('hub')); ?>">categoria, estado e marca</a>. Mostramos sempre o valor da 2ª praça.</li>
      <li><b>Leia o edital.</b> Ele diz a data, o lance mínimo, a comissão do leiloeiro, a forma de pagamento, a situação de débitos e se há visitação.</li>
      <li><b>Calcule o custo total.</b> O lance é só uma parte: some comissão, taxas e transferência (veja abaixo).</li>
      <li><b>Habilite-se no site do leiloeiro.</b> Cadastro e envio de documentos, com antecedência ao leilão.</li>
      <li><b>Dê o lance.</b> Pela internet, até o encerramento. Muitos leilões prorrogam o tempo quando entra lance no final.</li>
      <li><b>Pague e aguarde a carta de arrematação.</b> Com ela é feita a entrega do veículo e a transferência no Detran.</li>
    </ol>
  </section>

  <section class="seo__bloco guia">
    <h2>Quanto custa, de verdade</h2>
    <p>Exemplo com um lance de <b><?php echo esc_html(vj_seo_brl($ex['lance'])); ?></b> na 2ª praça:</p>
    <div class="composicao composicao--aberta guia__conta">
      <ul>
        <li><span>Lance (2ª praça)</span><b><?php echo esc_html(vj_seo_brl($ex['lance'])); ?></b></li>
        <li><span>Comissão do leiloeiro (<?php echo esc_html($k['comissao']); ?>% ou a do edital)</span><b><?php echo esc_html(vj_seo_brl($ex['comissao'])); ?></b></li>
        <li><span>Condução do oficial de justiça</span><b><?php echo esc_html($k['oficial']); ?></b></li>
        <li><span>Expedição da carta de arrematação</span><b><?php echo esc_html($k['carta']); ?></b></li>
        <li><span>Transferência do veículo (aprox.)</span><b><?php echo esc_html($k['transf']); ?></b></li>
      </ul>
      <p class="composicao__total"><span>Custo total estimado</span><b><?php echo esc_html(vj_seo_brl($ex['total'])); ?></b></p>
    </div>
    <p class="calc__nota">Assinantes veem esse cálculo pronto em cada veículo e podem simular qualquer lance.</p>
  </section>

  <section class="seo__bloco guia faq">
    <h2>Perguntas frequentes</h2>
    <?php foreach (vj_seo_faq() as $i => $q) : ?>
      <details<?php echo $i < 3 ? ' open' : ''; ?>>
        <summary><h3><?php echo esc_html($q[0]); ?></h3></summary>
        <p><?php echo wp_kses_post($q[1]); ?></p>
      </details>
    <?php endforeach; ?>
  </section>

  <section class="seo__bloco seo__autor">
    <img src="<?php echo esc_url(vj_asset('rubens/avatar.jpg')); ?>" alt="Dr. Rubens Filippe de Jesus" width="72" height="72" loading="lazy" />
    <div>
      <p><b>Dr. Rubens Filippe de Jesus</b> é advogado e membro da Comissão Especial de Leilões da OAB-SP. Assessora quem quer arrematar veículos em leilões judiciais com segurança.</p>
      <p><a class="link-ouro" href="<?php echo esc_url(vj_url_rubens()); ?>">Conheça o Rubens →</a></p>
    </div>
  </section>

<?php elseif ($p['rota'] === 'sumiu') : ?>
  <header class="seo__topo">
    <h1>Este leilão já saiu da vitrine</h1>
    <p class="seo__intro">O veículo foi arrematado, encerrado ou retirado pelo leiloeiro. Todos os dias entram novos veículos — veja os que estão abertos agora.</p>
  </header>
  <div class="fontes"><?php echo vj_seo_links_tipos(); ?></div>

<?php else :
    // hub, tipo, tipouf, marca
    $lotes = $p['lotes'] ?? [];
    $n = count($lotes);
    $filtro = [];
    if ($p['rota'] === 'hub') {
        $h1 = 'Leilão judicial de veículos';
        $intro = 'Todos os veículos em leilão judicial que o ' . VJ_MARCA . ' encontrou nos principais leiloeiros oficiais do Brasil, organizados por categoria, estado e marca. O valor exibido é sempre o da 2ª praça.';
        $lotes = array_slice($d['lotes'], 0, 24);
        $n = count($d['lotes']);
    } elseif ($p['rota'] === 'tipo') {
        $t = $tipos[$p['tipo']];
        $h1 = $t['nome'] . ' em leilão judicial';
        $intro = vj_seo_intro_tipo($p['tipo']);
        $filtro = ['tipo' => $p['tipo']];
    } elseif ($p['rota'] === 'tipouf') {
        $t = $tipos[$p['tipo']];
        $h1 = $t['nome'] . ' em leilão judicial em ' . $ufs[$p['uf']];
        $intro = ucfirst($t['plural']) . ' penhorados em processos judiciais e leiloados em ' . $ufs[$p['uf']] . '. ' . vj_seo_intro_tipo($p['tipo']);
        $filtro = ['tipo' => $p['tipo'], 'uf' => $p['uf']];
    } else {
        $h1 = $p['marca'] . ' em leilão judicial';
        $intro = 'Veículos ' . $p['marca'] . ' penhorados em processos judiciais e levados a leilão por leiloeiros oficiais em todo o Brasil. Confira modelo, ano, cidade e o valor da 2ª praça.';
        $filtro = ['marca' => $p['marca']];
    }
    $busca = $filtro ? add_query_arg($filtro, home_url('/')) : home_url('/');
    $mostrar = array_slice($lotes, 0, 60);
?>
  <header class="seo__topo">
    <p class="hero__eyebrow"><?php echo (int) $n; ?> veículos<?php echo $atualizado ? ' · atualizado em ' . esc_html($atualizado) : ''; ?></p>
    <h1><?php echo esc_html($h1); ?></h1>
    <p class="seo__intro"><?php echo esc_html($intro); ?></p>
  </header>

  <?php if ($p['rota'] === 'hub') : ?>
    <section class="seo__bloco">
      <h2>Por categoria</h2>
      <div class="fontes"><?php echo vj_seo_links_tipos(); ?></div>
    </section>
  <?php endif; ?>

  <?php if ($p['rota'] === 'tipo' && !empty($c['tipouf'][$p['tipo']])) :
      $est = $c['tipouf'][$p['tipo']]; arsort($est); ?>
    <section class="seo__bloco">
      <h2>Por estado</h2>
      <div class="fontes">
        <?php foreach ($est as $uf => $qt) : if ($qt < VJ_SEO_MIN || !isset($ufs[$uf])) continue; ?>
          <a class="chip" href="<?php echo esc_url(vj_seo_url('tipouf', $p['tipo'], $uf)); ?>"><?php echo esc_html($ufs[$uf]); ?> <small><?php echo (int) $qt; ?></small></a>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>

  <?php if ($mostrar) : ?>
    <section class="seo__bloco">
      <?php if ($p['rota'] === 'hub') : ?><h2>Encerrando em breve</h2><?php endif; ?>
      <div class="grade"><?php foreach ($mostrar as $l) echo vj_seo_card($l); ?></div>
      <div class="mais"><a class="btn btn--primario" href="<?php echo esc_url($busca); ?>"><?php echo $n > count($mostrar) ? 'Ver todos os ' . (int) $n . ' com filtros' : 'Abrir na busca com filtros'; ?></a></div>
    </section>
  <?php else : ?>
    <p class="vazio">Nenhum veículo desta categoria em leilão judicial agora. A lista é atualizada todos os dias às 6h — volte amanhã ou <a class="link-ouro" href="<?php echo esc_url(home_url('/')); ?>">veja todos os veículos</a>.</p>
  <?php endif; ?>

  <?php if (in_array($p['rota'], ['hub', 'tipo'], true)) :
      $marcas = array_filter($c['marca'], function ($mn) { return $mn[1] >= VJ_SEO_MIN; });
      if ($p['rota'] === 'tipo') {
          $marcas = [];
          foreach ($lotes as $l) if (!empty($l['marca'])) { $s = sanitize_title($l['marca']); $marcas[$s] = [$l['marca'], ($marcas[$s][1] ?? 0) + 1]; }
          $marcas = array_filter($marcas, function ($mn) use ($c) { return ($c['marca'][sanitize_title($mn[0])][1] ?? 0) >= VJ_SEO_MIN; });
          uasort($marcas, function ($a, $b) { return $b[1] <=> $a[1]; });
      }
      if ($marcas) : ?>
    <section class="seo__bloco">
      <h2>Por marca</h2>
      <div class="fontes">
        <?php foreach ($marcas as $mn) : ?><a class="chip" href="<?php echo esc_url(vj_seo_url('marca', $mn[0])); ?>"><?php echo esc_html($mn[0]); ?> <small><?php echo (int) $mn[1]; ?></small></a><?php endforeach; ?>
      </div>
    </section>
  <?php endif; endif; ?>

  <?php if ($p['rota'] === 'hub' && $c['uf']) :
      $est = $c['uf']; arsort($est); ?>
    <section class="seo__bloco">
      <h2>Carros em leilão judicial por estado</h2>
      <div class="fontes">
        <?php foreach ($c['tipouf']['carro'] ?? [] as $uf => $qt) : if ($qt < VJ_SEO_MIN || !isset($ufs[$uf])) continue; ?>
          <a class="chip" href="<?php echo esc_url(vj_seo_url('tipouf', 'carro', $uf)); ?>"><?php echo esc_html($ufs[$uf]); ?> <small><?php echo (int) $qt; ?></small></a>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>

  <section class="seo__bloco seo__cta">
    <h2>Quanto vai custar no total?</h2>
    <p>Além do lance, a arrematação tem comissão do leiloeiro, condução do oficial de justiça, carta de arrematação e transferência. Assinantes veem o custo total de cada veículo já calculado e o link direto do leilão.</p>
    <p><a class="link-ouro" href="<?php echo esc_url(vj_seo_url('guia')); ?>">Entenda os custos e como comprar em leilão judicial →</a></p>
  </section>
<?php endif; ?>
</main>
<?php get_footer();
