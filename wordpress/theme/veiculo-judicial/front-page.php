<?php
/* Home: vitrine de veículos. Gerado por wordpress/build.cjs a partir de index.html — não edite à mão. */
if (!defined('ABSPATH')) exit;
get_header();
?>
  <section class="hero">
    <div class="wrap">
      <p class="hero__eyebrow">Leilões judiciais de veículos</p>
      <h1>Veículos de leilão judicial.<br /><span>Uma busca só.</span></h1>
      <p class="hero__sub">Carros, motos, caminhões, tratores e muito mais: reunimos os veículos levados a leilão pela Justiça, publicados pelos leiloeiros oficiais de todo o país. Encontre, compare e arremate com assessoria.</p>
      <label class="busca">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input id="q" type="search" placeholder="Busque por marca, modelo ou cidade — ex.: Hilux, CG 160, Scania, Curitiba" autocomplete="off" />
      </label>
      <div class="fontes" id="fontes" aria-label="Leiloeiros"></div>
      <a class="hero__como" href="como-comprar-veiculo-em-leilao-judicial/">Como funciona o leilão judicial →</a>

      <div class="plano" id="plano" hidden>
        <div class="plano__txt">
          <span class="plano__selo">Vitrine gratuita</span>
          <p><b>O preço do lance não é o preço final.</b> Assinantes veem o custo total da operação (comissão, taxas do fórum e transferência), simulam o próprio lance, acessam o leilão e falam direto com o Rubens pra arrematar com segurança.</p>
        </div>
        <div class="plano__acoes">
          <button type="button" class="btn btn--primario" data-acao="assinar">Quero assinar</button>
          <button type="button" class="btn btn--linha" data-acao="entrar">Já sou assinante</button>
        </div>
      </div>
    </div>
  </section>

  <main class="wrap">
    <!-- Celular: botão que abre os filtros em tela cheia -->
    <div class="filtros-mobile">
      <button type="button" id="abrir-filtros" class="btn btn--linha"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Filtros <span id="n-filtros"></span></button>
    </div>
    <div class="filtros" id="filtros">
      <div class="filtros__topo"><b>Filtros</b><button type="button" id="fechar-filtros" aria-label="Fechar filtros">×</button></div>
      <select id="f-tipo" aria-label="Tipo de veículo"><option value="">Todos os veículos</option></select>
      <select id="f-marca" aria-label="Marca"><option value="">Todas as marcas</option></select>
      <select id="f-uf" aria-label="Estado"><option value="">Todo o Brasil</option></select>
      <select id="f-preco" aria-label="Preço máximo">
        <option value="">Qualquer preço</option>
        <option value="15000">Até R$ 15 mil</option>
        <option value="30000">Até R$ 30 mil</option>
        <option value="50000">Até R$ 50 mil</option>
        <option value="80000">Até R$ 80 mil</option>
        <option value="120000">Até R$ 120 mil</option>
      </select>
      <select id="f-ano" aria-label="Ano mínimo">
        <option value="">Qualquer ano</option>
        <option value="2022">2022 ou mais novo</option>
        <option value="2018">2018 ou mais novo</option>
        <option value="2012">2012 ou mais novo</option>
        <option value="2005">2005 ou mais novo</option>
      </select>
      <select id="f-ordem" aria-label="Ordenar">
        <option value="encerra">Encerram primeiro</option>
        <option value="menor">Menor preço</option>
        <option value="maior">Maior preço</option>
        <option value="desconto">Maior desconto</option>
        <option value="novo">Mais novos</option>
      </select>
      <button id="limpar" class="limpar" type="button" hidden>Limpar filtros</button>
      <button id="ver-resultados" class="btn btn--primario btn--cheio" type="button">Ver resultados</button>
    </div>

    <p class="contagem" id="contagem" aria-live="polite"></p>
    <div class="grade" id="grade"></div>
    <div class="mais"><button id="mais" type="button" hidden>Mostrar mais veículos</button></div>
    <p class="vazio" id="vazio" hidden>Nenhum veículo encontrado com esses filtros. Tente ampliar a busca.</p>
  </main>

  <!-- WhatsApp flutuante (assinantes) -->
  <a class="wpp-flutuante" id="wpp-flutuante" target="_blank" rel="noopener" hidden aria-label="Falar com o Rubens no WhatsApp">
    <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7a10.7 10.7 0 0 1-5.5-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.7-.5Z" /></svg>
  </a>

  <!-- Simulador de custo total (assinantes) -->
  <dialog class="modal modal--calc" id="modal-calc" aria-labelledby="calc-titulo">
    <div class="modal__caixa">
      <form method="dialog"><button class="modal__fechar" aria-label="Fechar">×</button></form>
      <span class="plano__selo">Simulador de arremate</span>
      <h2 id="calc-titulo">Quanto vai custar de verdade</h2>
      <div class="modal__carro" id="calc-carro"></div>
      <label>Seu lance (R$)
        <div class="calc__campo">
          <input id="calc-lance" inputmode="decimal" autocomplete="off" placeholder="0" />
          <button type="button" class="btn btn--linha btn--peq" data-soma="1000">+1 mil</button>
          <button type="button" class="btn btn--linha btn--peq" data-soma="5000">+5 mil</button>
        </div>
      </label>
      <label class="opcao"><input type="checkbox" id="calc-consultoria" data-consultoria /> Saber valor da consultoria do Dr. Rubens <small>(opcional)</small></label>
      <div class="composicao composicao--aberta" id="calc-tabela"></div>
      <p class="calc__nota">Valores estimados. A comissão do leiloeiro e as taxas podem variar conforme o edital; a transferência depende do estado e da situação do veículo.</p>
      <a class="btn btn--wpp btn--cheio" id="calc-wpp" target="_blank" rel="noopener">Enviar simulação ao Rubens</a>
    </div>
  </dialog>

  <!-- Login -->
  <dialog class="modal" id="modal-login" aria-labelledby="login-titulo">
    <form method="dialog" class="modal__caixa" id="form-login">
      <button class="modal__fechar" value="cancelar" formnovalidate aria-label="Fechar">×</button>
      <h2 id="login-titulo">Entrar</h2>
      <p class="modal__sub">Área do assinante: custo total de cada veículo, simulador de lance, links dos leilões e contato direto com o Rubens.</p>
      <label>E-mail<input type="email" name="email" autocomplete="username" required /></label>
      <label>Senha<input type="password" name="senha" autocomplete="current-password" required /></label>
      <p class="modal__erro" id="login-erro" hidden>E-mail ou senha incorretos.</p>
      <button type="submit" class="btn btn--primario btn--cheio" value="entrar">Entrar</button>
      <p class="modal__rodape" id="esqueci" hidden><a class="link" id="link-esqueci" href="#">Primeiro acesso ou esqueceu a senha? Crie uma nova aqui</a></p>
      <p class="modal__rodape">Ainda não é assinante? <button type="button" class="link" data-acao="assinar">Conheça o plano</button></p>
    </form>
  </dialog>

  <!-- Primeiro acesso / esqueci a senha (só no WordPress) -->
  <dialog class="modal" id="modal-esqueci" aria-labelledby="esqueci-titulo">
    <form method="dialog" class="modal__caixa" id="form-esqueci">
      <button class="modal__fechar" value="cancelar" formnovalidate aria-label="Fechar">×</button>
      <h2 id="esqueci-titulo">Criar ou trocar a senha</h2>
      <p class="modal__sub">Informe o e-mail usado na compra. Enviamos um link para você criar a senha aqui no site.</p>
      <label>E-mail<input type="email" name="email" autocomplete="username" required /></label>
      <p class="modal__erro" id="esqueci-erro" hidden></p>
      <p class="modal__ok" id="esqueci-ok" hidden></p>
      <button type="submit" class="btn btn--primario btn--cheio" value="enviar">Enviar link</button>
      <p class="modal__rodape"><button type="button" class="link" data-acao="entrar">Voltar para o login</button></p>
    </form>
  </dialog>

  <dialog class="modal" id="modal-senha" aria-labelledby="senha-titulo">
    <form method="dialog" class="modal__caixa" id="form-senha">
      <button class="modal__fechar" value="cancelar" formnovalidate aria-label="Fechar">×</button>
      <h2 id="senha-titulo">Crie sua senha</h2>
      <p class="modal__sub">Use pelo menos 8 caracteres. Depois é só entrar com seu e-mail e esta senha.</p>
      <label>Nova senha<input type="password" name="senha" autocomplete="new-password" minlength="8" required /></label>
      <label>Repita a senha<input type="password" name="senha2" autocomplete="new-password" minlength="8" required /></label>
      <p class="modal__erro" id="senha-erro" hidden></p>
      <button type="submit" class="btn btn--primario btn--cheio" value="salvar">Salvar e entrar</button>
    </form>
  </dialog>

  <!-- Paywall -->
  <dialog class="modal" id="modal-plano" aria-labelledby="plano-titulo">
    <div class="modal__caixa">
      <form method="dialog"><button class="modal__fechar" aria-label="Fechar">×</button></form>
      <span class="plano__selo">Assinatura</span>
      <h2 id="plano-titulo">Saiba quanto o veículo custa de verdade</h2>
      <div class="modal__carro" id="plano-carro" hidden></div>
      <ul class="beneficios">
        <li>Custo total da operação calculado em cada veículo: lance + comissão + taxas + transferência</li>
        <li>Simulador de lance: veja o total antes de disputar</li>
        <li>Link direto pro edital e pra página do leilão</li>
        <li>Contato direto com o Rubens pelo WhatsApp (consultoria jurídica opcional, contratada à parte)</li>
      </ul>
      <p class="preco-plano" id="preco-plano"></p>
      <a class="btn btn--wpp btn--cheio" id="btn-assinar-wpp" target="_blank" rel="noopener">Quero assinar pelo WhatsApp</a>
      <p class="modal__rodape">Já é assinante? <button type="button" class="link" data-acao="entrar">Entrar</button></p>
    </div>
  </dialog>

  <template id="tpl-card">
    <article class="card">
      <a class="card__foto card__link">
        <img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" />
        <span class="card__fonte"></span>
        <span class="card__tempo"></span>
      </a>
      <div class="card__corpo">
        <h3 class="card__titulo"><a class="card__link"></a></h3>
        <p class="card__specs"></p>
        <div class="card__preco">
          <span class="card__rotulo"></span>
          <strong class="card__valor"></strong>
          <span class="card__fipe"></span>
        </div>
        <div class="card__acoes"></div>
        <p class="card__natureza"></p>
      </div>
    </article>
  </template>
<?php get_footer();
