<?php
/*
Template Name: Quem é o Rubens
*/
/* Gerado por wordpress/build.cjs a partir de rubens.html — não edite à mão. */
if (!defined('ABSPATH')) exit;
$vj = vj_tema_config();
$insta_user = ltrim((string) $vj['instagram'], '@');
$insta = 'https://www.instagram.com/' . $insta_user . '/';
$wpp = vj_link_whats('Olá ' . $vj['nome_contato'] . '! Vi sua página no ' . VJ_MARCA . ' e gostaria de uma consultoria para arrematar um veículo em leilão judicial.');
get_header();
?>
  <main>
    <!-- Apresentação -->
    <section class="rb-hero">
      <div class="wrap rb-hero__grid">
        <div class="rb-hero__txt">
          <p class="hero__eyebrow">Quem está por trás da curadoria</p>
          <h1>Dr. Rubens<br />Filippe de Jesus</h1>
          <p class="rb-cargo">Advogado especialista em leilões judiciais, consultor em arrematações e referência institucional no setor de leilões de veículos.</p>
          <ul class="rb-selos" aria-label="Credenciais">
            <li>Advocacia especializada em leilões</li>
            <li>Consultoria em arrematações</li>
            <li>Comissão Especial de Leilões · OAB-SP</li>
          </ul>
          <div class="rb-acoes">
            <a class="btn btn--wpp js-wpp" href="<?php echo esc_url($wpp); ?>" target="_blank" rel="noopener">
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm5.9 15.7c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.7-.5Z"/></svg>
              Agendar consultoria
            </a>
            <a class="btn btn--linha" href="<?php echo esc_url(home_url('/')); ?>">Ver veículos em leilão</a>
          </div>
        </div>

        <figure class="rb-retrato">
          <div class="rb-retrato__foto">
            <img src="<?php echo esc_url(vj_asset('rubens/capa.jpg')); ?>" alt="Dr. Rubens Filippe de Jesus segurando o certificado do 1º Congresso de Leilão Judicial e Extrajudicial, no auditório da OAB São Paulo" width="854" height="1280" fetchpriority="high" />
          </div>
          <figcaption>
            <b>Dr. Rubens Filippe de Jesus</b>
            <a href="<?php echo esc_url($insta); ?>" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.1" class="insta__ponto" /></svg>
              <?php echo esc_html('@' . $insta_user); ?>
            </a>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- Intro -->
    <section class="wrap rb-intro">
      <p>No mercado de leilões de veículos, <b>a rentabilidade anda de mãos dadas com a segurança jurídica.</b> Para garantir que nossos investidores operem com total transparência, conformidade e minimização de riscos, nossa plataforma conta com a expertise e a liderança técnica do Dr. Rubens Filippe de Jesus.</p>
      <img class="rb-intro__foto" src="<?php echo esc_url(vj_asset('rubens/retrato.jpg')); ?>" alt="Dr. Rubens Filippe de Jesus, de terno azul e braços cruzados" width="854" height="1280" loading="lazy" />
    </section>

    <!-- Trajetória -->
    <section class="wrap rb-secao">
      <header class="rb-secao__cab">
        <span class="rb-num">01</span>
        <div>
          <h2>Trajetória e atuação jurídica</h2>
          <p>Com uma sólida e reconhecida carreira na advocacia especializada, o Dr. Rubens dedica sua atuação à estruturação e à análise preventiva de operações no mercado de alienações judiciais e extrajudiciais.</p>
        </div>
      </header>
      <div class="rb-cards">
        <article class="rb-card">
          <span class="rb-card__icone" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6M11 8v6" /></svg></span>
          <h3>Due diligence especializada em veículos</h3>
          <p>Análise rigorosa de passivos judiciais, bloqueios administrativos (RENAJUD), penhoras, débitos tributários e gravames bancários que incidem sobre veículos de leilão.</p>
        </article>
        <article class="rb-card">
          <span class="rb-card__icone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" /></svg></span>
          <h3>Assessoria estratégica para investidores</h3>
          <p>Desenvolvimento de pareceres de risco e de viabilidade jurídica para arrematações de pequeno, médio e grande porte.</p>
        </article>
        <article class="rb-card">
          <span class="rb-card__icone" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /><path d="m14.5 16.5 1.5 1.5 3-3" /></svg></span>
          <h3>Regularização e desbloqueio processual</h3>
          <p>Atuação ágil junto aos tribunais e órgãos de trânsito para expedição de cartas de arrematação, baixas de restrições e regularização documental dos bens apregoados.</p>
        </article>
      </div>
    </section>

    <!-- OAB-SP -->
    <section class="wrap rb-secao">
      <header class="rb-secao__cab">
        <span class="rb-num">02</span>
        <div>
          <h2>Atuação institucional e liderança na OAB-SP</h2>
          <p>Além da prática advocatícia, o Dr. Rubens tem papel ativo no desenvolvimento e no aprimoramento regulatório do mercado de leilões no Brasil, com destaque para sua atuação na Ordem dos Advogados do Brasil – Seção São Paulo.</p>
        </div>
      </header>
      <div class="rb-linha">
        <div class="rb-linha__item">
          <img class="rb-linha__foto rb-linha__foto--painel" src="<?php echo esc_url(vj_asset('rubens/painel-oab.jpg')); ?>" alt="Dr. Rubens falando ao microfone em painel da Comissão de Leilão Judicial e Extrajudicial da OAB São Paulo" width="854" height="1280" loading="lazy" />
          <div class="rb-linha__txt">
            <h3>Comissão Especial de Leilões da OAB-SP</h3>
            <p>Membro ativo e incentivador do fortalecimento do ecossistema de leilões, promovendo debates sobre segurança jurídica, boas práticas e modernização das arrematações.</p>
          </div>
        </div>
        <div class="rb-linha__item rb-linha__item--destaque">
          <img class="rb-linha__foto rb-linha__foto--congresso" src="<?php echo esc_url(vj_asset('rubens/congresso.jpg')); ?>" alt="Dr. Rubens com o certificado diante do painel do Congresso de Leilão Judicial e Extrajudicial" width="854" height="1280" loading="lazy" />
          <div class="rb-linha__txt">
            <span class="rb-tag">Marco histórico</span>
            <h3>1º Congresso de Leilão Judicial e Extrajudicial da OAB-SP</h3>
            <p>Protagonizou a idealização e a realização do evento pioneiro promovido pela Comissão Especial de Leilões, que reuniu magistrados, leiloeiros, advogados e grandes investidores para debater o futuro do setor.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Diferencial + citação -->
    <section class="wrap rb-secao">
      <header class="rb-secao__cab">
        <span class="rb-num">03</span>
        <div>
          <h2>O diferencial para o investidor</h2>
          <p>A presença e a curadoria do Dr. Rubens garantem que a busca e a seleção de veículos na plataforma não sejam apenas sobre oportunidades de preço, mas sobre investimentos sólidos e estruturados.</p>
        </div>
      </header>
      <figure class="rb-faixa">
        <img src="<?php echo esc_url(vj_asset('rubens/networking.jpg')); ?>" alt="Dr. Rubens conversando com outros participantes durante evento do setor de leilões" width="1280" height="854" loading="lazy" />
        <figcaption>Dr. Rubens em conversa com profissionais do setor durante evento de leilões.</figcaption>
      </figure>
      <blockquote class="rb-citacao">
        <p>A arrematação de veículos só se torna um grande negócio quando acompanhada de rigor técnico e respaldo jurídico. Nosso compromisso é entregar a inteligência e a segurança necessárias para que o investidor foque no que importa: o seu retorno.</p>
        <footer>— Dr. Rubens Filippe de Jesus</footer>
      </blockquote>
    </section>

    <!-- CTA -->
    <section class="wrap">
      <div class="rb-cta">
        <div>
          <h2>Vai arrematar um veículo em leilão judicial?</h2>
          <p>Antes do lance, fale com o Rubens: análise do edital, débitos, restrições e o custo total real da operação.</p>
        </div>
        <div class="rb-acoes">
          <a class="btn btn--wpp js-wpp" href="<?php echo esc_url($wpp); ?>" target="_blank" rel="noopener">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm5.9 15.7c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.7-.5Z"/></svg>
            Falar no WhatsApp
          </a>
          <a class="btn btn--linha" href="<?php echo esc_url($insta); ?>" target="_blank" rel="noopener">Seguir <?php echo esc_html('@' . $insta_user); ?></a>
        </div>
      </div>
    </section>
  </main>
<?php get_footer();
