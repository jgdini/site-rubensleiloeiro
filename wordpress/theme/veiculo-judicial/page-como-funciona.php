<?php
/*
Template Name: Como Funciona
*/
if (!defined('ABSPATH')) exit;
$vj  = vj_tema_config();
$wpp = vj_link_whats('Olá ' . $vj['nome_contato'] . '! Vi o ' . VJ_MARCA . ' e gostaria de saber mais sobre como funciona a plataforma.');
$assinante = function_exists('vj_usuario_premium') && vj_usuario_premium();
get_header();
?>
  <main class="cf-page wrap">

    <!-- Herói -->
    <section class="cf-hero">
      <p class="hero__eyebrow">Entenda o processo</p>
      <h1>Como funciona o <?php echo esc_html(VJ_MARCA); ?></h1>
      <p class="cf-hero__sub">Curadoria jurídica de veículos em leilão judicial — do filtro até o documento na mão.</p>
    </section>

    <!-- Passo a passo -->
    <section class="cf-passos">
      <article class="cf-passo">
        <span class="cf-passo__num">01</span>
        <div class="cf-passo__txt">
          <h2>Acesse os veículos curados</h2>
          <p>Nossa equipe filtra centenas de leilões judiciais e seleciona apenas os veículos com melhor relação entre preço de arremate e custo total estimado — sem surpresas.</p>
        </div>
      </article>
      <article class="cf-passo">
        <span class="cf-passo__num">02</span>
        <div class="cf-passo__txt">
          <h2>Simule o custo real</h2>
          <p>Cada anúncio traz uma simulação do custo total: comissão do leiloeiro, ITCMD, transferência e eventuais débitos estimados. O preço que você vê é o preço que vai pagar.</p>
        </div>
      </article>
      <article class="cf-passo">
        <span class="cf-passo__num">03</span>
        <div class="cf-passo__txt">
          <h2>Assessoria jurídica antes e depois</h2>
          <p>O Dr. Rubens Filippe de Jesus analisa o edital, verifica restrições (RENAJUD, penhoras, débitos) e acompanha a regularização documental até o veículo estar 100% em seu nome.</p>
        </div>
      </article>
      <article class="cf-passo">
        <span class="cf-passo__num">04</span>
        <div class="cf-passo__txt">
          <h2>Arremate com segurança</h2>
          <p>Com o respaldo jurídico certo, você faz o lance sabendo exatamente o que está comprando. Sem risco oculto, sem documento pendente.</p>
        </div>
      </article>
    </section>

    <!-- Botões de conversão -->
    <section class="cf-conversao">
      <h2 class="cf-conversao__titulo">Por onde você quer começar?</h2>
      <div class="cf-btns">

        <?php if (!$assinante) : ?>
        <!-- Não assinante: Contratação de Plataforma -->
        <a class="cf-btn cf-btn--destaque"
           href="https://pay.kiwify.com.br/RdII0jC"
           target="_blank" rel="noopener nofollow">
          <span class="cf-btn__titulo">Contratação de Plataforma</span>
          <span class="cf-btn__desc">Acesse os veículos curados e simule lances com segurança jurídica.</span>
          <span class="cf-btn__cta">Assinar agora →</span>
        </a>
        <?php else : ?>
        <!-- Assinante: Assessoria Pré-Arrematação -->
        <a class="cf-btn cf-btn--pro"
           href="https://pay.kiwify.com.br/35YSqNf"
           target="_blank" rel="noopener nofollow">
          <span class="cf-btn__titulo">Assessoria Pré-Arrematação</span>
          <span class="cf-btn__desc">O Dr. Rubens analisa o edital e emite parecer de viabilidade antes do seu lance.</span>
          <span class="cf-btn__cta">Contratar assessoria →</span>
        </a>
        <!-- Assinante: Assessoria Jurídica Pós-Arrematação -->
        <a class="cf-btn cf-btn--pro"
           href="https://pay.kiwify.com.br/EuqPok0"
           target="_blank" rel="noopener nofollow">
          <span class="cf-btn__titulo">Assessoria Jurídica Pós-Arrematação</span>
          <span class="cf-btn__desc">Regularização completa: carta de arrematação, baixa de restrições e transferência.</span>
          <span class="cf-btn__cta">Contratar regularização →</span>
        </a>
        <?php endif; ?>

        <!-- Para todos: Contato direto com o Rubens -->
        <a class="cf-btn cf-btn--wpp btn--wpp js-wpp"
           href="<?php echo esc_url($wpp); ?>"
           target="_blank" rel="noopener">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm5.9 15.7c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.7-.5Z"/></svg>
          <span class="cf-btn__titulo">Contato Direto com o Rubens</span>
          <span class="cf-btn__desc">Fale diretamente com o Dr. Rubens Filippe de Jesus pelo WhatsApp.</span>
          <span class="cf-btn__cta">Abrir WhatsApp →</span>
        </a>

      </div>
    </section>

  </main>
<?php get_footer();
