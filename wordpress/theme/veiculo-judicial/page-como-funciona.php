<?php
/*
Template Name: Como Funciona
*/
if (!defined('ABSPATH')) exit;
$k  = vj_seo_custos();
$ex = vj_seo_exemplo();
get_header();
?>
<main class="wrap seo">

  <!-- Motion animado -->
  <div class="cf-motion-wrap">
    <iframe class="cf-motion" src="<?php echo esc_url(get_template_directory_uri() . '/assets/motion.html'); ?>" title="Como funciona o Veículo Judicial — animação" loading="lazy" allowfullscreen></iframe>
  </div>

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

  <!-- Botões de conversão — página exclusiva para logados -->
  <section class="seo__bloco cf-conversao">
    <h2 class="cf-conversao__titulo">Por onde você quer começar?</h2>
    <div class="cf-btns">
      <a class="cf-btn cf-btn--pro" href="https://pay.kiwify.com.br/35YSqNf" target="_blank" rel="noopener nofollow">
        <span class="cf-btn__titulo">Assessoria Pré-Arrematação</span>
        <span class="cf-btn__desc">O Dr. Rubens analisa o edital e emite parecer de viabilidade antes do seu lance.</span>
        <span class="cf-btn__cta">Contratar assessoria →</span>
      </a>
      <a class="cf-btn cf-btn--pro" href="https://pay.kiwify.com.br/EuqPok0" target="_blank" rel="noopener nofollow">
        <span class="cf-btn__titulo">Assessoria Jurídica Pós-Arrematação</span>
        <span class="cf-btn__desc">Regularização completa: carta de arrematação, baixa de restrições e transferência no Detran.</span>
        <span class="cf-btn__cta">Contratar regularização →</span>
      </a>
    </div>
  </section>

  <section class="seo__bloco seo__autor">
    <img src="<?php echo esc_url(vj_asset('rubens/avatar.jpg')); ?>" alt="Dr. Rubens Filippe de Jesus" width="72" height="72" loading="lazy" />
    <div>
      <p><b>Dr. Rubens Filippe de Jesus</b> é advogado e membro da Comissão Especial de Leilões da OAB-SP. Assessora quem quer arrematar veículos em leilões judiciais com segurança.</p>
      <p><a class="link-ouro" href="<?php echo esc_url(vj_url_rubens()); ?>">Conheça o Rubens →</a></p>
    </div>
  </section>

</main>
<?php get_footer();
