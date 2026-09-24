// ============ Configuração do negócio ============
const CONFIG = {
  // WhatsApp do Rubens (DDI+DDD+número, só dígitos): +55 11 94758-1678
  whatsapp: '5511947581678',
  nomeContato: 'Rubens',
  precoPlano: 'R$ 49,90/mês', // PLACEHOLDER

  // Custos da operação de arremate (mostrados ao assinante).
  custos: {
    consultoria: 2700, // primeira consultoria do Rubens
    comissaoPct: 5, // comissão do leiloeiro sobre o valor arrematado
    oficialJustica: 115, // condução do oficial de justiça
    cartaArrematacao: 80, // expedição da carta de arrematação
    transferencia: 600, // transferência do veículo (estimativa)
  },
};

// Composição do custo total para um valor de arremate.
function calcularCustos(valor, comissaoLote) {
  const c = CONFIG.custos;
  const pct = comissaoLote > 0 ? comissaoLote : c.comissaoPct; // comissão do edital, quando a fonte informa
  const itens = [
    { rotulo: 'Valor da arrematação', valor },
    { rotulo: `Comissão do leiloeiro (${pct}%)`, valor: Math.round(valor * pct) / 100 },
    { rotulo: 'Condução do oficial de justiça', valor: c.oficialJustica },
    { rotulo: 'Expedição da carta de arrematação', valor: c.cartaArrematacao },
    { rotulo: 'Transferência do veículo (aprox.)', valor: c.transferencia, aprox: true },
    { rotulo: 'Consultoria Rubens (1ª consultoria)', valor: c.consultoria },
  ];
  return { itens, total: itens.reduce((s, i) => s + i.valor, 0) };
}

// Protótipo: login simulado no navegador. Em produção isto vira um login de verdade no servidor,
// e data/lotes.json só é entregue a quem está autenticado.
const USUARIOS_TESTE = [{ email: 'assinante@teste.com', senha: 'leilao2026', nome: 'Cliente Teste' }];
// ================================================

const CORES = { leiloesjudiciais: '#4f8cff', megaleiloes: '#ff5a1f', lancejudicial: '#ffc53d', leilaovip: '#2ecc71', d1lance: '#e84393', eleiloes: '#00cec9', tjsp: '#a29bfe' };
const POR_PAGINA = 36;
const CHAVE_SESSAO = 'radar-sessao';

const $ = (s) => document.querySelector(s);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: n % 1 ? 2 : 0 });
const km = (n) => n.toLocaleString('pt-BR') + ' km';
const semAcento = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const estado = { q: '', fontes: new Set(), marca: '', uf: '', preco: '', ano: '', ordem: 'encerra', mostrando: POR_PAGINA };
let dados = { lotes: [], fontes: [] };
let nomesFonte = {};
let sessao = null;

// ---------- Sessão ----------
function lerSessao() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO)); } catch { return null; }
}
function gravarSessao(s) {
  try { s ? localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)) : localStorage.removeItem(CHAVE_SESSAO); } catch {}
}
const premium = () => !!sessao;

function linkWhats(texto) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
}

// ---------- Utilidades de exibição ----------
function tempoRestante(iso) {
  if (!iso) return { txt: '', urgente: false };
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return { txt: 'Em andamento', urgente: true };
  const h = ms / 36e5;
  if (h < 1) return { txt: `Encerra em ${Math.ceil(ms / 6e4)} min`, urgente: true };
  if (h < 24) return { txt: `Encerra em ${Math.floor(h)}h${String(Math.floor((ms % 36e5) / 6e4)).padStart(2, '0')}`, urgente: h < 6 };
  const d = new Date(iso);
  return { txt: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), urgente: false };
}
function relativo(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 6e4);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h}h` : `há ${Math.round(h / 24)} dia(s)`;
}
function desconto(l) {
  if (l.valorMercado && l.lance) return Math.round((1 - l.lance / l.valorMercado) * 100);
  return l.desconto ?? null;
}
function localDe(l) {
  return l.cidade ? `${l.cidade}${l.uf ? '/' + l.uf : ''}` : l.uf || '';
}

// ---------- Filtro / ordenação ----------
function filtrar() {
  const termos = semAcento(estado.q).split(/\s+/).filter(Boolean);
  const r = dados.lotes.filter((l) => {
    if (estado.fontes.size && !estado.fontes.has(l.fonte)) return false;
    if (estado.marca && l.marca !== estado.marca) return false;
    if (estado.uf && l.uf !== estado.uf) return false;
    if (estado.preco && !(l.lance && l.lance <= +estado.preco)) return false;
    if (estado.ano && !(l.ano && l.ano >= +estado.ano)) return false;
    if (termos.length) {
      const alvo = l._busca || (l._busca = semAcento([l.titulo, l.tituloOriginal, l.marca, l.cidade, l.uf, l.ano, nomesFonte[l.fonte]].join(' ')));
      if (!termos.every((t) => alvo.includes(t))) return false;
    }
    return true;
  });
  const nulo = (v, alto) => (v == null ? (alto ? Infinity : -Infinity) : v);
  const ord = {
    encerra: (a, b) => nulo(a.encerra && +new Date(a.encerra), 1) - nulo(b.encerra && +new Date(b.encerra), 1),
    menor: (a, b) => nulo(a.lance, 1) - nulo(b.lance, 1),
    maior: (a, b) => nulo(b.lance, 0) - nulo(a.lance, 0),
    desconto: (a, b) => nulo(desconto(b), 0) - nulo(desconto(a), 0),
    novo: (a, b) => nulo(b.ano, 0) - nulo(a.ano, 0),
  }[estado.ordem] || (() => 0);
  return r.sort(ord);
}

// ---------- Card ----------
const ICONE_WPP = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm5.9 15.7c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.7-.5Z"/></svg>';
const ICONE_SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>';
const ICONE_CADEADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

const ICONE_CALC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>';

function tabelaCustos(c) {
  return (
    `<ul>${c.itens.map((i) => `<li><span>${i.rotulo === 'Valor da arrematação' ? i.rotulo : '+ ' + i.rotulo}</span><b>${i.aprox ? '≈ ' : ''}${brl(i.valor)}</b></li>`).join('')}</ul>` +
    `<p class="composicao__total"><span>Total estimado</span><b>${brl(c.total)}</b></p>`
  );
}

function card(l) {
  const el = $('#tpl-card').content.firstElementChild.cloneNode(true);
  const pro = premium();
  el.style.setProperty('--c', CORES[l.fonte] || 'var(--laranja)');
  el.classList.toggle('card--travado', !pro);

  const foto = el.querySelector('.card__foto');
  const img = foto.querySelector('img');
  if (l.imagem) {
    img.src = l.imagem;
    img.alt = l.titulo;
    img.onload = () => foto.classList.add('ok');
    img.onerror = () => foto.classList.add('ok', 'sem');
  } else foto.classList.add('ok', 'sem');

  el.querySelector('.card__fonte').textContent = pro ? (l.fonte === 'tjsp' && l.leiloeiro) || nomesFonte[l.fonte] : 'Leilão judicial';
  const t = tempoRestante(l.encerra);
  const tempo = el.querySelector('.card__tempo');
  tempo.textContent = t.txt;
  tempo.classList.toggle('urgente', t.urgente);
  if (l.encerra) tempo.dataset.iso = l.encerra;

  el.querySelector('.card__titulo a').textContent = l.titulo;
  const specs = [l.ano, l.km != null ? km(l.km) : null, localDe(l)].filter(Boolean);
  el.querySelector('.card__specs').innerHTML = specs.map((s) => `<span>${esc(s)}</span>`).join('') || '<span>Detalhes no anúncio</span>';

  const valor = el.querySelector('.card__valor');
  const rotulo = el.querySelector('.card__rotulo');
  const acoes = el.querySelector('.card__acoes');
  const links = el.querySelectorAll('.card__link');

  // Preço do carro: visível para todos.
  if (l.lance) {
    rotulo.textContent = l.lances ? `Lance atual · ${l.lances} lance${l.lances > 1 ? 's' : ''}` : l.lotes > 1 ? 'A partir de' : 'Lance mínimo';
    valor.textContent = brl(l.lance);
  } else {
    rotulo.textContent = l.lotes > 1 ? `${l.lotes} lotes neste leilão` : 'Valor';
    valor.textContent = 'Valores no edital';
    valor.classList.add('sem');
  }
  const d = desconto(l);
  el.querySelector('.card__fipe').textContent = l.valorMercado && d > 0 ? `−${d}% vs. valor de mercado` : l.desconto ? `${l.desconto}% abaixo da avaliação` : '';

  // Custo total da operação.
  const total = document.createElement('div');
  total.className = 'card__total';
  el.querySelector('.card__preco').after(total);

  if (pro) {
    links.forEach((a) => Object.assign(a, { href: l.url, target: '_blank', rel: 'noopener nofollow' }));
    if (l.lance) {
      const c = calcularCustos(l.lance, l.comissao);
      total.innerHTML =
        `<span class="card__total-rot">Custo total estimado</span>` +
        `<strong>${brl(c.total)}</strong>` +
        `<button type="button" class="info" aria-label="Ver composição do custo">i</button>` +
        `<div class="composicao" role="tooltip">${tabelaCustos(c)}</div>`;
    } else {
      total.innerHTML = `<span class="card__total-rot">Custo total</span><span class="card__total-sem">informe o lance no simulador</span>`;
    }
    const msg = `Olá ${CONFIG.nomeContato}! Tenho interesse neste carro de leilão judicial:\n${l.titulo}${l.ano ? ' ' + l.ano : ''} — ${localDe(l)}\n${l.lance ? 'Lance: ' + brl(l.lance) + ' · custo total estimado: ' + brl(calcularCustos(l.lance, l.comissao).total) + '\n' : ''}${l.url}`;
    acoes.innerHTML =
      `<a class="btn btn--wpp btn--linha-toda" target="_blank" rel="noopener" href="${esc(linkWhats(msg))}">${ICONE_WPP}Falar com ${esc(CONFIG.nomeContato)}</a>` +
      `<button type="button" class="btn btn--linha" data-simular>${ICONE_CALC}Simular</button>` +
      `<a class="btn btn--linha" target="_blank" rel="noopener nofollow" href="${esc(l.url)}">Ver leilão ${ICONE_SETA}</a>`;
    acoes.querySelector('[data-simular]').onclick = () => abrirSimulador(l);
    // No celular não existe hover: o "i" abre/fecha a composição no toque.
    const info = total.querySelector('.info');
    if (info)
      info.onclick = (e) => {
        e.stopPropagation();
        const abrir = !total.classList.contains('aberto');
        document.querySelectorAll('.card__total.aberto').forEach((t) => t.classList.remove('aberto'));
        total.classList.toggle('aberto', abrir);
      };
    el.querySelector('.card__natureza').textContent = [l.natureza, l.comitente].filter(Boolean).join(' · ') || l.status || '';
  } else {
    // Vitrine gratuita: preço visível, mas sem link e sem custo total. Clique abre o plano.
    links.forEach((a) => {
      a.removeAttribute('href');
      a.setAttribute('role', 'button');
      a.tabIndex = a.classList.contains('card__foto') ? -1 : 0;
    });
    total.innerHTML = `<span class="card__total-rot">Custo total c/ taxas e assessoria</span><span class="cadeado">${ICONE_CADEADO}Assinantes</span>`;
    acoes.innerHTML = `<button type="button" class="btn btn--primario btn--cheio">${ICONE_CADEADO}Ver anúncio e custo total</button>`;
    el.querySelector('.card__natureza').textContent = 'Leilão judicial';
    const abrir = () => abrirPlano(l);
    el.addEventListener('click', abrir);
    el.addEventListener('keydown', (e) => e.key === 'Enter' && e.target.matches('[role=button]') && abrir());
  }
  return el;
}

// ---------- Render ----------
function render() {
  const lista = filtrar();
  $('#grade').replaceChildren(...lista.slice(0, estado.mostrando).map(card));
  $('#contagem').innerHTML = `<b>${lista.length.toLocaleString('pt-BR')}</b> ${lista.length === 1 ? 'carro encontrado' : 'carros encontrados'}`;
  $('#mais').hidden = lista.length <= estado.mostrando;
  $('#vazio').hidden = lista.length > 0;

  const ativo = estado.q || estado.fontes.size || estado.marca || estado.uf || estado.preco || estado.ano;
  $('#limpar').hidden = !ativo;
  for (const [id, k] of [['#f-marca', 'marca'], ['#f-uf', 'uf'], ['#f-preco', 'preco'], ['#f-ano', 'ano']]) $(id).classList.toggle('ativo', !!estado[k]);
  document.querySelectorAll('.chip[data-fonte]').forEach((c) => c.setAttribute('aria-pressed', estado.fontes.has(c.dataset.fonte)));
  salvarURL();
}

function opcoes(sel, valores) {
  const s = $(sel);
  s.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
  for (const [v, n] of valores) s.add(new Option(`${v} (${n})`, v));
}
function contar(campo) {
  const m = new Map();
  for (const l of dados.lotes) if (l[campo]) m.set(l[campo], (m.get(l[campo]) || 0) + 1);
  return [...m];
}

function salvarURL() {
  const p = new URLSearchParams();
  if (estado.q) p.set('q', estado.q);
  if (estado.fontes.size) p.set('fonte', [...estado.fontes].join(','));
  for (const k of ['marca', 'uf', 'preco', 'ano']) if (estado[k]) p.set(k, estado[k]);
  if (estado.ordem !== 'encerra') p.set('ordem', estado.ordem);
  const qs = p.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}
function lerURL() {
  const p = new URLSearchParams(location.search);
  estado.q = p.get('q') || '';
  estado.fontes = new Set((p.get('fonte') || '').split(',').filter(Boolean));
  for (const k of ['marca', 'uf', 'preco', 'ano']) estado[k] = p.get(k) || '';
  estado.ordem = p.get('ordem') || 'encerra';
  if (!premium()) estado.fontes.clear(); // leiloeiro é informação de assinante
  $('#q').value = estado.q;
  for (const k of ['marca', 'uf', 'preco', 'ano', 'ordem']) $('#f-' + k).value = estado[k];
}

// ---------- Modais ----------
function abrirPlano(l) {
  const box = $('#plano-carro');
  if (l) {
    box.hidden = false;
    box.innerHTML = `${l.imagem ? `<img src="${esc(l.imagem)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(l.titulo)}</b><span>${esc([l.ano, localDe(l)].filter(Boolean).join(' · '))}</span><span class="borrado">R$ 00.000</span></div>`;
  } else box.hidden = true;
  const msg = l
    ? `Olá ${CONFIG.nomeContato}! Quero assinar o Radar de Leilões. Vi este carro: ${l.titulo}${l.ano ? ' ' + l.ano : ''} (${localDe(l)}).`
    : `Olá ${CONFIG.nomeContato}! Quero assinar o Radar de Leilões.`;
  $('#btn-assinar-wpp').href = linkWhats(msg);
  $('#preco-plano').innerHTML = `<b>${esc(CONFIG.precoPlano.split('/')[0])}</b>${CONFIG.precoPlano.includes('/') ? ' /' + esc(CONFIG.precoPlano.split('/')[1]) : ''}`;
  $('#btn-assinar-wpp').innerHTML = `${ICONE_WPP}Quero assinar pelo WhatsApp`;
  $('#modal-login').close();
  $('#modal-plano').showModal();
}
function abrirSimulador(l) {
  const m = $('#modal-calc');
  $('#calc-carro').innerHTML = `${l.imagem ? `<img src="${esc(l.imagem)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(l.titulo)}</b><span>${esc([l.ano, localDe(l)].filter(Boolean).join(' · '))}</span>${l.lance ? `<span>Lance atual: ${brl(l.lance)}</span>` : ''}</div>`;
  const input = $('#calc-lance');
  const atualizar = () => {
    const v = Math.max(0, parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0);
    const c = calcularCustos(v, l.comissao);
    $('#calc-tabela').innerHTML = tabelaCustos(c);
    const msg = `Olá ${CONFIG.nomeContato}! Fiz uma simulação no Radar de Leilões:\n${l.titulo}${l.ano ? ' ' + l.ano : ''} — ${localDe(l)}\nLance simulado: ${brl(v)}\nCusto total estimado: ${brl(c.total)}\n${l.url}\nPodemos conversar?`;
    $('#calc-wpp').href = linkWhats(msg);
  };
  $('#calc-wpp').innerHTML = `${ICONE_WPP}Enviar simulação ao ${esc(CONFIG.nomeContato)}`;
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  input.value = l.lance ? fmt(l.lance) : '';
  input.oninput = atualizar;
  input.onblur = () => input.value && (input.value = fmt(parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0));
  // Atalhos: +R$ 1.000 / +R$ 5.000 sobre o lance atual (a disputa costuma subir).
  m.querySelectorAll('[data-soma]').forEach((b) => {
    b.onclick = () => {
      const v = parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0;
      input.value = fmt(v + +b.dataset.soma);
      atualizar();
    };
  });
  atualizar();
  m.showModal();
  input.focus();
  input.select();
}

function abrirLogin() {
  $('#modal-plano').close();
  $('#login-erro').hidden = true;
  $('#form-login').reset();
  $('#modal-login').showModal();
  $('#form-login [name=email]').focus();
}

// ---------- Modo (gratuito / assinante) ----------
function montarConta() {
  const conta = $('#conta');
  if (premium()) {
    conta.innerHTML = `<span class="conta__selo">Assinante</span><span class="conta__nome">${esc(sessao.nome.split(' ')[0])}</span><button type="button" class="link" id="sair">Sair</button>`;
    $('#sair').onclick = async () => { sessao = null; gravarSessao(null); await trocarModo(); };
  } else {
    conta.innerHTML = `<button type="button" class="btn btn--linha btn--peq" data-acao="entrar">Entrar</button><button type="button" class="btn btn--primario btn--peq" data-acao="assinar">Assinar</button>`;
  }
  $('#plano').hidden = premium();
  const wpp = $('#wpp-flutuante');
  wpp.hidden = !premium();
  wpp.href = linkWhats(`Olá ${CONFIG.nomeContato}! Sou assinante do Radar de Leilões e queria uma ajuda.`);
  // Filtros/ordenações por preço só para assinantes.
  document.querySelectorAll('[data-premium]').forEach((o) => {
    if (o.tagName === 'OPTION') {
      o.textContent = o.textContent.replace(/ 🔒$/, '') + (premium() ? '' : ' 🔒');
    } else {
      o.classList.toggle('travado', !premium());
      o.options[0].textContent = premium() ? 'Qualquer preço' : 'Preço 🔒';
    }
  });
}

function montarFontes() {
  const fontesEl = $('#fontes');
  fontesEl.replaceChildren();
  if (!premium()) {
    fontesEl.innerHTML = `<span class="chip chip--info"><span class="ponto" style="--c:var(--verde)"></span>${dados.leiloeiros || ''} leiloeiros oficiais monitorados todo dia</span>`;
    $('#rodape-fontes').textContent = '';
    return;
  }
  for (const f of dados.fontes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.fonte = f.id;
    b.style.setProperty('--c', CORES[f.id]);
    b.innerHTML = `<span class="ponto"></span>${esc(f.nome)}<small>${f.total}</small>`;
    b.onclick = () => {
      estado.fontes.has(f.id) ? estado.fontes.delete(f.id) : estado.fontes.add(f.id);
      estado.mostrando = POR_PAGINA;
      render();
    };
    fontesEl.append(b);
  }
  $('#rodape-fontes').innerHTML = 'Fontes: ' + dados.fontes.map((f) => `<a href="${esc(f.site)}" target="_blank" rel="noopener nofollow">${esc(f.nome)}</a>`).join(' · ');
}

async function carregarDados() {
  // Gratuito carrega só a vitrine (sem preços/links). Assinante carrega a base completa.
  const arquivo = premium() ? 'data/lotes.json' : 'data/vitrine.json';
  dados = await (await fetch(arquivo, { cache: 'no-cache' })).json();
  dados.fontes ||= [];
  nomesFonte = Object.fromEntries(dados.fontes.map((f) => [f.id, f.nome]));
  // Coleta é diária: esconde o que já encerrou desde então (tolerância de 1h).
  dados.lotes = dados.lotes.filter((l) => !l.encerra || new Date(l.encerra) > Date.now() - 36e5);
  if (!dados.leiloeiros) {
    const s = new Set(dados.fontes.filter((f) => !['leiloesjudiciais', 'tjsp'].includes(f.id)).map((f) => f.id));
    dados.lotes.forEach((l) => l.leiloeiroSite && s.add(l.leiloeiroSite));
    dados.leiloeiros = s.size;
  }
}

async function trocarModo() {
  document.body.classList.toggle('modo-pro', premium());
  await carregarDados();
  $('#meta').innerHTML = `<span class="pulso"></span>${dados.lotes.length.toLocaleString('pt-BR')} carros · ${dados.leiloeiros} leiloeiros · atualizado ${relativo(dados.geradoEm)}`;
  montarConta();
  montarFontes();
  opcoes('#f-marca', contar('marca').sort((a, b) => a[0].localeCompare(b[0])));
  opcoes('#f-uf', contar('uf').sort((a, b) => a[0].localeCompare(b[0])));
  lerURL();
  estado.mostrando = POR_PAGINA;
  render();
}

// ---------- Início ----------
async function iniciar() {
  sessao = lerSessao();

  try {
    await trocarModo();
  } catch {
    $('#meta').textContent = 'Não foi possível carregar os anúncios agora.';
    return;
  }

  // Botões "entrar"/"assinar" espalhados pela página.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    b.dataset.acao === 'entrar' ? abrirLogin() : abrirPlano();
  });

  $('#form-login').addEventListener('submit', async (e) => {
    if (e.submitter?.value === 'cancelar') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const email = String(f.get('email')).trim().toLowerCase();
    const u = USUARIOS_TESTE.find((x) => x.email === email && x.senha === String(f.get('senha')));
    if (!u) {
      $('#login-erro').hidden = false;
      return;
    }
    sessao = { email: u.email, nome: u.nome, desde: new Date().toISOString() };
    gravarSessao(sessao);
    $('#modal-login').close();
    await trocarModo();
  });

  // Fecha a composição de custo aberta ao tocar fora dela.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.card__total')) document.querySelectorAll('.card__total.aberto').forEach((t) => t.classList.remove('aberto'));
  });

  // Fecha modal clicando fora.
  for (const m of document.querySelectorAll('dialog.modal'))
    m.addEventListener('click', (e) => e.target === m && m.close());

  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => ((estado.q = e.target.value.trim()), (estado.mostrando = POR_PAGINA), render()), 150);
  });
  for (const k of ['marca', 'uf', 'preco', 'ano', 'ordem'])
    $('#f-' + k).addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      if (!premium() && (e.target.hasAttribute('data-premium') || opt?.hasAttribute('data-premium'))) {
        e.target.value = estado[k];
        abrirPlano();
        return;
      }
      estado[k] = e.target.value;
      estado.mostrando = POR_PAGINA;
      render();
    });
  $('#mais').onclick = () => ((estado.mostrando += POR_PAGINA), render());
  $('#limpar').onclick = () => {
    Object.assign(estado, { q: '', fontes: new Set(), marca: '', uf: '', preco: '', ano: '', mostrando: POR_PAGINA });
    $('#q').value = '';
    for (const k of ['marca', 'uf', 'preco', 'ano']) $('#f-' + k).value = '';
    render();
  };

  // Atualiza as contagens regressivas a cada minuto.
  setInterval(() => {
    document.querySelectorAll('.card__tempo[data-iso]').forEach((el) => {
      const t = tempoRestante(el.dataset.iso);
      el.textContent = t.txt;
      el.classList.toggle('urgente', t.urgente);
    });
  }, 60000);
}

iniciar();
