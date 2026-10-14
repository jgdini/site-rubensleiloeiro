<?php
/* Popup de introdução — exibido pelo popup.js apenas para usuários logados que ainda não viram. */
if (!defined('ABSPATH')) exit;
?>
<div id="vj-popup-intro" class="vj-popup-overlay" hidden aria-modal="true" role="dialog" aria-label="Como funciona o Veículo Judicial">

  <div class="vj-pp-reel" id="vj-pp-reel">

    <div class="vj-pp-prog" id="vj-pp-prog"></div>

    <div class="vj-pp-logo">
      <div class="vj-pp-logo-name"><div class="vj-pp-dot"></div>Veículo Judicial</div>
      <div class="vj-pp-n">1 / 7</div>
    </div>

    <!-- Frame 1: A confusão -->
    <div class="vj-pp-frame is-active">
      <div class="vj-pp-eye">A confusão que todo mundo faz</div>
      <div class="vj-pp-h">Todo dia <em>alguém</em> confunde.</div>
      <div class="vj-pp-sub">As mensagens chegam no WhatsApp, no Instagram, nos comentários.</div>
      <div class="vj-pp-vis">
        <div class="vj-pp-bubble"><div class="bn">@seguidor_1</div>"Rubens, quanto custa esse Hilux? Consigo parcelar?"</div>
        <div class="vj-pp-bubble"><div class="bn">@seguidor_2</div>"Você é o dono? Quero comprar esse Civic."</div>
        <div class="vj-pp-bubble"><div class="bn">@seguidor_3</div>"Isso é golpe ou você mesmo vende esses carros?"</div>
      </div>
    </div>

    <!-- Frame 2: Não vendemos -->
    <div class="vj-pp-frame">
      <div class="vj-pp-eye">Esclarece de vez</div>
      <div class="vj-pp-h">Não vendemos <em>nada.</em></div>
      <div class="vj-pp-sub">Nunca vendemos. Nunca vamos vender. A dúvida é justa — agora entenda por quê.</div>
      <div class="vj-pp-vis">
        <div class="vj-pp-proof"><div class="pi">✕</div>Não temos estoque de veículos.</div>
        <div class="vj-pp-proof"><div class="pi">✕</div>Não recebemos seu pagamento.</div>
        <div class="vj-pp-proof"><div class="pi">✕</div>Não negociamos preço. O edital do leilão define tudo.</div>
      </div>
    </div>

    <!-- Frame 3: Somos um agregador -->
    <div class="vj-pp-frame">
      <div class="vj-pp-eye">O que fazemos</div>
      <div class="vj-pp-h">Somos um <em>agregador</em> de leilões.</div>
      <div class="vj-pp-sub">Reunimos veículos levados a leilão pela Justiça, de leiloeiros oficiais de todo o Brasil.</div>
      <div class="vj-pp-vis">
        <div class="vj-pp-src"><div class="vj-pp-src-dot"></div><div class="vj-pp-src-name">Leilões Judiciais</div><div class="vj-pp-src-cnt">800+ lotes</div></div>
        <div class="vj-pp-src"><div class="vj-pp-src-dot"></div><div class="vj-pp-src-name">ZUK Leilões</div><div class="vj-pp-src-cnt">400+ lotes</div></div>
        <div class="vj-pp-src"><div class="vj-pp-src-dot"></div><div class="vj-pp-src-name">Outros leiloeiros</div><div class="vj-pp-src-cnt">500+ lotes</div></div>
        <div class="vj-pp-src total"><div class="vj-pp-src-dot" style="background:var(--pp-gt)"></div><div class="vj-pp-src-name">Total disponível</div><div class="vj-pp-src-cnt">1.700+ veículos</div></div>
      </div>
    </div>

    <!-- Frame 4: Buscar -->
    <div class="vj-pp-frame">
      <div class="vj-pp-step">Passo 1 de 3</div>
      <div class="vj-pp-h">Busque o <em>veículo.</em></div>
      <div class="vj-pp-sub">Por marca, modelo ou cidade. Veja o preço da 2ª praça já com desconto.</div>
      <div class="vj-pp-vis">
        <div class="vj-pp-mock">
          <div class="vj-pp-chrome">
            <div class="vj-pp-cdot"></div><div class="vj-pp-cdot"></div><div class="vj-pp-cdot"></div>
            <div class="vj-pp-url">veiculojudicial.com.br</div>
          </div>
          <div class="vj-pp-mbody">
            <div class="vj-pp-sbar">
              <span style="font-size:11px">🔍</span>
              <div class="vj-pp-stxt">Hilux, CG 160, Curitiba…</div>
              <div class="vj-pp-scur"></div>
            </div>
            <div class="vj-pp-chips">
              <div class="vj-pp-chip on">Carros</div>
              <div class="vj-pp-chip on">SP</div>
              <div class="vj-pp-chip">Até R$ 50k</div>
            </div>
            <div class="vj-pp-res">
              <div class="vj-pp-rthumb">🚗</div>
              <div style="flex:1">
                <div class="vj-pp-rt">Toyota Hilux 4x4 SRV</div>
                <div class="vj-pp-rs2">2ª praça · Sorocaba-SP · 3d</div>
              </div>
              <div class="vj-pp-rp">R$ 42k</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame 5: Custo real -->
    <div class="vj-pp-frame">
      <div class="vj-pp-step">Passo 2 de 3</div>
      <div class="vj-pp-h">Veja o custo <em>real.</em></div>
      <div class="vj-pp-sub">O lance é só uma parte. Assinantes veem o total calculado.</div>
      <div class="vj-pp-vis">
        <div class="vj-pp-mock">
          <div class="vj-pp-chrome">
            <div class="vj-pp-cdot"></div><div class="vj-pp-cdot"></div><div class="vj-pp-cdot"></div>
            <div class="vj-pp-url">simulador de arremate</div>
          </div>
          <div class="vj-pp-mbody">
            <div class="vj-pp-crow"><div class="vj-pp-cl">Lance (2ª praça)</div><div class="vj-pp-cv">R$ 30.000</div></div>
            <div class="vj-pp-crow"><div class="vj-pp-cl">Comissão (5%)</div><div class="vj-pp-cv">R$ 1.500</div></div>
            <div class="vj-pp-crow"><div class="vj-pp-cl">Oficial de justiça</div><div class="vj-pp-cv">R$ 115</div></div>
            <div class="vj-pp-crow"><div class="vj-pp-cl">Transferência</div><div class="vj-pp-cv">R$ 600</div></div>
            <div class="vj-pp-crow tot"><div class="vj-pp-cl">Custo total estimado</div><div class="vj-pp-cv">R$ 32.295</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame 6: Rubens -->
    <div class="vj-pp-frame">
      <div class="vj-pp-step">Passo 3 de 3</div>
      <div class="vj-pp-h">O Rubens faz a <em>assessoria.</em></div>
      <div class="vj-pp-sub">Ele não vende o carro — te acompanha no arremate <strong>com segurança.</strong></div>
      <div class="vj-pp-vis">
        <div class="vj-pp-rub">
          <div class="vj-pp-rtop">
            <div class="vj-pp-rav">⚖️</div>
            <div>
              <div class="vj-pp-rname">Dr. Rubens Filippe de Jesus</div>
              <div class="vj-pp-rrole">Advogado · OAB-SP</div>
            </div>
          </div>
          <div class="vj-pp-rbadge">Comissão Especial de Leilões · OAB-SP</div>
          <div class="vj-pp-rdesc">Assessora quem quer arrematar veículos em leilões judiciais com segurança.</div>
          <div class="vj-pp-rnote">A assessoria é paga e opcional. O site é gratuito para todos.</div>
        </div>
      </div>
    </div>

    <!-- Frame 7: CTA -->
    <div class="vj-pp-frame">
      <div class="vj-pp-eye">Comece agora</div>
      <div class="vj-pp-h">Acesse <em>grátis.</em></div>
      <div class="vj-pp-sub">Veja os veículos disponíveis hoje. Sem pagar nada.</div>
      <div class="vj-pp-vis">
        <div class="vj-pp-ctap">✦ Vitrine gratuita — sem cadastro</div>
        <div class="vj-pp-ctau">veiculojudicial.com.br</div>
        <div class="vj-pp-ctad">Assinantes veem o custo total e falam direto com o Rubens.</div>
      </div>
    </div>

    <div class="vj-pp-tip">toque para avançar ›</div>
  </div><!-- /.vj-pp-reel -->

  <div class="vj-popup-footer">
    <label class="vj-popup-label">
      <input type="checkbox" id="vj-popup-entendi">
      Já entendi, não mostrar novamente
    </label>
    <button type="button" id="vj-popup-fechar" class="vj-popup-fechar">Fechar</button>
  </div>

</div><!-- /#vj-popup-intro -->
