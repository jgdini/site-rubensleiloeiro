// Aviso de isenção de responsabilidade: aparece na primeira visita (e de novo se o texto mudar de versão).
(function () {
  var VERSAO = '2026-10-03';
  var CHAVE = 'vj-aviso';
  try { if (localStorage.getItem(CHAVE) === VERSAO) return; } catch (e) {}

  var marca = (window.VJ && window.VJ.marca) || 'Veículo Judicial';
  var d = document.createElement('dialog');
  d.className = 'modal modal--aviso';
  d.setAttribute('aria-labelledby', 'aviso-titulo');
  d.innerHTML =
    '<div class="modal__caixa">' +
    '<span class="plano__selo">Aviso importante</span>' +
    '<h2 id="aviso-titulo">Antes de continuar</h2>' +
    '<p>O <b>' + marca + '</b> é uma ferramenta de busca: reunimos anúncios de leilões judiciais publicados por leiloeiros oficiais em seus próprios sites e mostramos tudo num só lugar.</p>' +
    '<p><b>Não somos leiloeiros, não vendemos os veículos e não participamos dos leilões.</b> Fotos, descrições, valores, datas e condições são de responsabilidade exclusiva de cada leiloeiro e podem mudar, estar desatualizados ou conter erros.</p>' +
    '<p>Antes de dar qualquer lance, confira o edital e o anúncio original no site do leiloeiro. O ' + marca + ' não se responsabiliza por divergências nas informações, pelo resultado dos leilões nem por negociações feitas com terceiros.</p>' +
    '<button type="button" class="btn btn--primario btn--cheio">Li e entendi</button>' +
    '</div>';
  document.body.appendChild(d);

  function ok() {
    try { localStorage.setItem(CHAVE, VERSAO); } catch (e) {}
    d.close();
    d.remove();
  }
  d.querySelector('button').addEventListener('click', ok);
  d.addEventListener('cancel', ok); // Esc também conta como "li"
  if (typeof d.showModal === 'function') d.showModal();
})();
