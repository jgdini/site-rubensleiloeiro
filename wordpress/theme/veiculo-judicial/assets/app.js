// Gerado por wordpress/gerar-app-wp.cjs a partir de assets/app.js — não edite à mão.
// ============ Configuração do negócio (vem do WordPress: Configurações → Veículo Judicial) ============
const VJ = window.VJ || {};
const CONFIG = {
  marca: VJ.marca || 'Veículo Judicial',
  whatsapp: VJ.whatsapp || '5511947581678',
  nomeContato: VJ.nomeContato || 'Rubens',
  precoPlano: VJ.precoPlano || 'R$ 49,90/mês',
  checkoutUrl: VJ.checkoutUrl || '',
  custos: Object.assign({ consultoria: 2700, comissaoPct: 5, oficialJustica: 115, cartaArrematacao: 80, transferencia: 600 }, VJ.custos || {}),
};

// A consultoria do Rubens é um serviço à parte e opcional: só entra na conta se o assinante marcar
// "Saber valor da consultoria" (evita venda casada). A escolha fica guardada no navegador.
const CHAVE_CONSULTORIA = 'vj-consultoria';
let comConsultoria = false;
try { comConsultoria = localStorage.getItem(CHAVE_CONSULTORIA) === '1'; } catch {}
function definirConsultoria(sim) {
  comConsultoria = !!sim;
  try { localStorage.setItem(CHAVE_CONSULTORIA, comConsultoria ? '1' : '0'); } catch {}
  document.querySelectorAll('[data-consultoria]').forEach((c) => (c.checked = comConsultoria));
}

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
  ];
  if (comConsultoria) itens.push({ rotulo: 'Consultoria Dr. Rubens (opcional)', valor: c.consultoria });
  return { itens, total: itens.reduce((s, i) => s + i.valor, 0) };
}

// ================================================

const CORES = { leiloesjudiciais: '#4f8cff', megaleiloes: '#ff5a1f', lancejudicial: '#ffc53d', leilaovip: '#2ecc71', d1lance: '#e84393', eleiloes: '#00cec9', tjsp: '#a29bfe', platb: '#7fb3ff', zuk: '#f5a623' };
const POR_PAGINA = 36;
const CHAVE_SESSAO = 'radar-sessao';

const $ = (s) => document.querySelector(s);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: n % 1 ? 2 : 0 });
const km = (n) => n.toLocaleString('pt-BR') + ' km';
const semAcento = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const estado = { q: '', fontes: new Set(), tipo: '', marca: '', uf: '', preco: '', ano: '', ordem: 'encerra', mostrando: POR_PAGINA };

// Tipos de veículo (mesmas chaves de scraper/classify.js).
const TIPOS = { carro: 'Carros e utilitários', moto: 'Motos', caminhao: 'Caminhões', onibus: 'Ônibus e vans', maquina: 'Tratores e máquinas', reboque: 'Reboques e carretas', nautico: 'Barcos e jet skis', aeronave: 'Aeronaves' };
const TIPO_CURTO = { moto: 'Moto', caminhao: 'Caminhão', onibus: 'Ônibus', maquina: 'Máquina', reboque: 'Reboque', nautico: 'Náutico', aeronave: 'Aeronave' };
let dados = { lotes: [], fontes: [] };
let nomesFonte = {};
let sessao = null;

// ---------- Sessão (WordPress) ----------
function lerSessao() {
  return VJ.logado ? { nome: VJ.usuario || '', assinante: !!VJ.assinante } : null;
}
const premium = () => !!(sessao && sessao.assinante);

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
// Valor exibido: o da 2ª praça (2º leilão). Sem 2ª praça (leilão único), o valor do próprio lote.
function preco(l) {
  return l.segundaPraca || l.lance || null;
}
// Desconto da 2ª praça sobre a 1ª (a 1ª praça normalmente é a avaliação).
function desconto(l) {
  if (l.segundaPraca && l.lanceInicial > l.segundaPraca) return Math.round((1 - l.segundaPraca / l.lanceInicial) * 100);
  if (l.valorMercado && preco(l)) return Math.round((1 - preco(l) / l.valorMercado) * 100);
  return l.desconto ?? null;
}
// Lote com 2ª praça cuja 1ª ainda não terminou (data quando a fonte informa; senão, a praça vista na coleta).
function emPrimeiraPraca(l) {
  if (!l.segundaPraca) return false;
  if (l.fimPraca1) return new Date(l.fimPraca1).getTime() > Date.now();
  return l.praca === 1;
}
function localDe(l) {
  return l.cidade ? `${l.cidade}${l.uf ? '/' + l.uf : ''}` : l.uf || '';
}

// ---------- Filtro / ordenação ----------
function filtrar() {
  const termos = semAcento(estado.q).split(/\s+/).filter(Boolean);
  const r = dados.lotes.filter((l) => {
    if (estado.fontes.size && !estado.fontes.has(l.fonte)) return false;
    if (estado.tipo && (l.tipo || 'carro') !== estado.tipo) return false;
    if (estado.marca && l.marca !== estado.marca) return false;
    if (estado.uf && l.uf !== estado.uf) return false;
    if (estado.preco && !(preco(l) && preco(l) <= +estado.preco)) return false;
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
    menor: (a, b) => nulo(preco(a), 1) - nulo(preco(b), 1),
    maior: (a, b) => nulo(preco(b), 0) - nulo(preco(a), 0),
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
  el.style.setProperty('--c', CORES[l.fonte] || 'var(--ouro)');
  el.classList.toggle('card--travado', !pro);

  const foto = el.querySelector('.card__foto');
  const img = foto.querySelector('img');
  if (l.imagem) {
    img.src = l.imagem;
    img.alt = l.titulo;
    img.onload = () => foto.classList.add('ok');
    img.onerror = () => foto.classList.add('ok', 'sem');
  } else foto.classList.add('ok', 'sem');

  el.querySelector('.card__fonte').textContent = pro ? (['tjsp', 'platb'].includes(l.fonte) && l.leiloeiro) || nomesFonte[l.fonte] : 'Leilão judicial';
  const t = tempoRestante(l.encerra);
  const tempo = el.querySelector('.card__tempo');
  tempo.textContent = t.txt;
  tempo.classList.toggle('urgente', t.urgente);
  if (l.encerra) tempo.dataset.iso = l.encerra;

  el.querySelector('.card__titulo a').textContent = l.titulo;
  const specs = [TIPO_CURTO[l.tipo], l.ano, l.km != null ? km(l.km) : null, localDe(l)].filter(Boolean);
  el.querySelector('.card__specs').innerHTML = specs.map((s) => `<span>${esc(s)}</span>`).join('') || '<span>Detalhes no anúncio</span>';

  const valor = el.querySelector('.card__valor');
  const rotulo = el.querySelector('.card__rotulo');
  const acoes = el.querySelector('.card__acoes');
  const links = el.querySelectorAll('.card__link');

  // Preço do carro (2ª praça): visível para todos.
  const p = preco(l);
  if (p) {
    rotulo.textContent = l.segundaPraca ? '2º leilão (2ª praça)' : l.lotes > 1 ? 'A partir de' : 'Praça única';
    valor.textContent = brl(p);
  } else {
    rotulo.textContent = l.lotes > 1 ? `${l.lotes} lotes neste leilão` : 'Valor';
    valor.textContent = 'Valores no edital';
    valor.classList.add('sem');
  }
  const d = desconto(l);
  el.querySelector('.card__fipe').textContent = d > 0 ? `${d}% abaixo da avaliação` : '';
  if (emPrimeiraPraca(l)) {
    const aviso = document.createElement('p');
    aviso.className = 'card__aviso';
    const quando = l.fimPraca1 ? new Date(l.fimPraca1).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    aviso.innerHTML = `<b>Em andamento na 1ª praça</b>${quando ? ` · o valor da 2ª vale após ${quando}` : ' · o valor da 2ª vale se não houver lance'}`;
    el.querySelector('.card__preco').before(aviso);
  }

  // Custo total da operação.
  const total = document.createElement('div');
  total.className = 'card__total';
  el.querySelector('.card__preco').after(total);

  if (pro) {
    links.forEach((a) => Object.assign(a, { href: l.url, target: '_blank', rel: 'noopener nofollow' }));
    if (p) {
      const c = calcularCustos(p, l.comissao);
      total.innerHTML =
        `<span class="card__total-rot">Custo total estimado</span>` +
        `<strong>${brl(c.total)}</strong>` +
        `<button type="button" class="info" aria-label="Ver composição do custo">i</button>` +
        `<div class="composicao" role="tooltip">${tabelaCustos(c)}</div>`;
    } else {
      total.innerHTML = `<span class="card__total-rot">Custo total</span><span class="card__total-sem">informe o lance no simulador</span>`;
    }
    const msg = `Olá ${CONFIG.nomeContato}! Tenho interesse neste veículo de leilão judicial:\n${l.titulo}${l.ano ? ' ' + l.ano : ''} — ${localDe(l)}\n${p ? (l.segundaPraca ? '2º leilão: ' : 'Valor: ') + brl(p) + ' · custo total estimado: ' + brl(calcularCustos(p, l.comissao).total) + '\n' : ''}${l.url}`;
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
    total.innerHTML = `<span class="card__total-rot">Custo total c/ taxas</span><span class="cadeado">${ICONE_CADEADO}Assinantes</span>`;
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
  $('#contagem').innerHTML = `<b>${lista.length.toLocaleString('pt-BR')}</b> ${lista.length === 1 ? 'veículo encontrado' : 'veículos encontrados'}` +
    (premium() ? `<label class="opcao"><input type="checkbox" data-consultoria${comConsultoria ? ' checked' : ''}> Saber valor da consultoria do Dr. Rubens <small>(opcional)</small></label>` : '');
  const op = $('#contagem [data-consultoria]');
  if (op) op.onchange = () => { definirConsultoria(op.checked); render(); };
  $('#mais').hidden = lista.length <= estado.mostrando;
  $('#vazio').hidden = lista.length > 0;

  const ativo = estado.q || estado.fontes.size || estado.tipo || estado.marca || estado.uf || estado.preco || estado.ano;
  $('#limpar').hidden = !ativo;
  const nAtivos = ['tipo', 'marca', 'uf', 'preco', 'ano'].filter((k) => estado[k]).length;
  $('#n-filtros').textContent = nAtivos ? `(${nAtivos})` : '';
  $('#ver-resultados').textContent = `Ver ${lista.length.toLocaleString('pt-BR')} ${lista.length === 1 ? 'veículo' : 'veículos'}`;
  for (const [id, k] of [['#f-tipo', 'tipo'], ['#f-marca', 'marca'], ['#f-uf', 'uf'], ['#f-preco', 'preco'], ['#f-ano', 'ano']]) $(id).classList.toggle('ativo', !!estado[k]);
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
  for (const k of ['tipo', 'marca', 'uf', 'preco', 'ano']) if (estado[k]) p.set(k, estado[k]);
  if (estado.ordem !== 'encerra') p.set('ordem', estado.ordem);
  const qs = p.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}
function lerURL() {
  const p = new URLSearchParams(location.search);
  estado.q = p.get('q') || '';
  estado.fontes = new Set((p.get('fonte') || '').split(',').filter(Boolean));
  for (const k of ['tipo', 'marca', 'uf', 'preco', 'ano']) estado[k] = p.get(k) || '';
  estado.ordem = p.get('ordem') || 'encerra';
  if (!premium()) estado.fontes.clear(); // leiloeiro é informação de assinante
  $('#q').value = estado.q;
  for (const k of ['tipo', 'marca', 'uf', 'preco', 'ano', 'ordem']) $('#f-' + k).value = estado[k];
}

// ---------- Modais ----------
function abrirPlano(l) {
  const box = $('#plano-carro');
  if (l) {
    box.hidden = false;
    box.innerHTML = `${l.imagem ? `<img src="${esc(l.imagem)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(l.titulo)}</b><span>${esc([l.ano, localDe(l)].filter(Boolean).join(' · '))}</span><span class="borrado">R$ 00.000</span></div>`;
  } else box.hidden = true;
  const msg = l
    ? `Olá ${CONFIG.nomeContato}! Quero assinar o ${CONFIG.marca}. Vi este veículo: ${l.titulo}${l.ano ? ' ' + l.ano : ''} (${localDe(l)}).`
    : `Olá ${CONFIG.nomeContato}! Quero assinar o ${CONFIG.marca}.`;
  const btn = $('#btn-assinar-wpp');
  if (CONFIG.checkoutUrl) {
    btn.href = CONFIG.checkoutUrl;
    btn.className = 'btn btn--primario btn--cheio';
  } else btn.href = linkWhats(msg);
  $('#preco-plano').innerHTML = `<b>${esc(CONFIG.precoPlano.split('/')[0])}</b>${CONFIG.precoPlano.includes('/') ? ' /' + esc(CONFIG.precoPlano.split('/')[1]) : ''}`;
  btn.innerHTML = CONFIG.checkoutUrl ? 'Assinar agora' : `${ICONE_WPP}Quero assinar pelo WhatsApp`;
  $('#modal-login').close();
  $('#modal-plano').showModal();
}
function abrirSimulador(l) {
  const m = $('#modal-calc');
  $('#calc-carro').innerHTML = `${l.imagem ? `<img src="${esc(l.imagem)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(l.titulo)}</b><span>${esc([l.ano, localDe(l)].filter(Boolean).join(' · '))}</span>${preco(l) ? `<span>${l.segundaPraca ? '2º leilão' : 'Praça única'}: ${brl(preco(l))}</span>` : ''}</div>`;
  const input = $('#calc-lance');
  const atualizar = () => {
    const v = Math.max(0, parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0);
    const c = calcularCustos(v, l.comissao);
    $('#calc-tabela').innerHTML = tabelaCustos(c);
    const msg = `Olá ${CONFIG.nomeContato}! Fiz uma simulação no ${CONFIG.marca}:\n${l.titulo}${l.ano ? ' ' + l.ano : ''} — ${localDe(l)}\nLance simulado: ${brl(v)}\nCusto total estimado: ${brl(c.total)}\n${l.url}\nPodemos conversar?`;
    $('#calc-wpp').href = linkWhats(msg);
  };
  $('#calc-wpp').innerHTML = `${ICONE_WPP}Enviar simulação ao ${esc(CONFIG.nomeContato)}`;
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  input.value = preco(l) ? fmt(preco(l)) : '';
  input.oninput = atualizar;
  const opcao = $('#calc-consultoria');
  opcao.checked = comConsultoria;
  opcao.onchange = () => { definirConsultoria(opcao.checked); atualizar(); render(); };
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
  $('#esqueci').hidden = false;
  $('#modal-login').showModal();
  $('#form-login [name=email]').focus();
}

// ---------- Modo (gratuito / assinante) ----------
function montarConta() {
  const conta = $('#conta');
  if (premium()) {
    conta.innerHTML = `<span class="conta__selo">Assinante</span><span class="conta__nome">${esc(sessao.nome.split(' ')[0])}</span>${VJ.painelUrl ? `<a class="link" href="${esc(VJ.painelUrl)}">Leiloeiros</a>` : ''}<a class="link" href="${esc(VJ.logoutUrl)}">Sair</a>`;
  } else if (sessao) {
    conta.innerHTML = `<span class="conta__nome" title="Sua assinatura não está ativa">${esc(sessao.nome.split(' ')[0])} · sem assinatura</span><button type="button" class="btn btn--primario btn--peq" data-acao="assinar">Assinar</button><a class="link" href="${esc(VJ.logoutUrl)}">Sair</a>`;
  } else {
    conta.innerHTML = `<button type="button" class="btn btn--linha btn--peq" data-acao="entrar">Entrar</button><button type="button" class="btn btn--primario btn--peq" data-acao="assinar">Assinar</button>`;
  }
  $('#plano').hidden = premium();
  const wpp = $('#wpp-flutuante');
  wpp.hidden = !premium();
  wpp.href = linkWhats(`Olá ${CONFIG.nomeContato}! Sou assinante do ${CONFIG.marca} e queria uma ajuda.`);
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
  const url = premium() ? VJ.lotesUrl : VJ.vitrineUrl;
  const r = await fetch(url, { credentials: 'same-origin', headers: premium() ? { 'X-WP-Nonce': VJ.nonce } : {} });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  dados = await r.json();
  dados.lotes ||= [];
  dados.fontes ||= [];
  nomesFonte = Object.fromEntries(dados.fontes.map((f) => [f.id, f.nome]));
  // Coleta é diária: esconde o que já encerrou desde então (tolerância de 1h).
  dados.lotes = dados.lotes.filter((l) => !l.encerra || new Date(l.encerra) > Date.now() - 36e5);
  if (!dados.leiloeiros) {
    const s = new Set(dados.fontes.filter((f) => !['leiloesjudiciais', 'tjsp', 'platb'].includes(f.id)).map((f) => f.id));
    dados.lotes.forEach((l) => l.leiloeiroSite && s.add(l.leiloeiroSite));
    dados.leiloeiros = s.size;
  }
}

async function trocarModo() {
  document.body.classList.toggle('modo-pro', premium());
  await carregarDados();
  $('#meta').innerHTML = `<span class="pulso"></span>${dados.lotes.length.toLocaleString('pt-BR')} veículos · ${dados.leiloeiros} leiloeiros · atualizado ${relativo(dados.geradoEm)}`;
  montarConta();
  montarFontes();
  // Tipos na ordem de TIPOS, com a contagem de cada um.
  const nTipo = new Map();
  dados.lotes.forEach((l) => nTipo.set(l.tipo || 'carro', (nTipo.get(l.tipo || 'carro') || 0) + 1));
  const sTipo = $('#f-tipo');
  sTipo.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
  for (const [k, nome] of Object.entries(TIPOS)) if (nTipo.get(k)) sTipo.add(new Option(`${nome} (${nTipo.get(k)})`, k));
  opcoes('#f-marca', contar('marca').sort((a, b) => a[0].localeCompare(b[0])));
  opcoes('#f-uf', contar('uf').sort((a, b) => a[0].localeCompare(b[0])));
  lerURL();
  estado.mostrando = POR_PAGINA;
  render();
}

// ---------- Início ----------
async function atualizarSessao() {
  try {
    const r = await fetch(VJ.sessaoUrl, { credentials: 'same-origin', cache: 'no-store' });
    const s = await r.json();
    Object.assign(VJ, { logado: !!s.logado, usuario: s.nome || '', assinante: !!s.assinante });
    if (s.nonce) VJ.nonce = s.nonce;
    if (s.sair) VJ.logoutUrl = s.sair;
    VJ.painelUrl = s.painel || '';
  } catch {}
}

async function postarConta(url, corpo) {
  const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || 'Não foi possível concluir agora. Tente de novo.');
  return j;
}

function abrirEsqueci() {
  $('#modal-login').close();
  $('#form-esqueci').reset();
  $('#esqueci-erro').hidden = true;
  $('#esqueci-ok').hidden = true;
  $('#form-esqueci [type=submit]').hidden = false;
  $('#modal-esqueci').showModal();
  $('#form-esqueci [name=email]').focus();
}

function iniciarConta() {
  $('#link-esqueci').addEventListener('click', (e) => { e.preventDefault(); abrirEsqueci(); });

  $('#form-esqueci').addEventListener('submit', async (e) => {
    if (e.submitter?.value === 'cancelar') return;
    e.preventDefault();
    const botao = e.target.querySelector('[type=submit]');
    botao.disabled = true;
    $('#esqueci-erro').hidden = true;
    try {
      const j = await postarConta(VJ.senhaPedirUrl, { email: String(new FormData(e.target).get('email')).trim() });
      $('#esqueci-ok').textContent = j.mensagem;
      $('#esqueci-ok').hidden = false;
      botao.hidden = true;
    } catch (err) {
      $('#esqueci-erro').textContent = err.message;
      $('#esqueci-erro').hidden = false;
    }
    botao.disabled = false;
  });

  // Link do e-mail: /?vj-senha={chave}&u={login} abre "Crie sua senha"; /?vj-esqueci=1 abre o pedido de link.
  const p = new URLSearchParams(location.search);
  const limparURL = () => {
    const u = new URL(location.href);
    ['vj-senha', 'u', 'vj-esqueci'].forEach((k) => u.searchParams.delete(k));
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  };
  if (p.get('vj-esqueci')) { limparURL(); abrirEsqueci(); }
  if (p.get('vj-senha') && p.get('u')) {
    const chave = p.get('vj-senha'), login = p.get('u');
    limparURL();
    $('#senha-erro').hidden = true;
    $('#modal-senha').showModal();
    $('#form-senha').addEventListener('submit', async (e) => {
      if (e.submitter?.value === 'cancelar') return;
      e.preventDefault();
      const f = new FormData(e.target);
      const erro = (m) => { $('#senha-erro').textContent = m; $('#senha-erro').hidden = false; };
      if (String(f.get('senha')).length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.');
      if (f.get('senha') !== f.get('senha2')) return erro('As duas senhas não são iguais.');
      const botao = e.target.querySelector('[type=submit]');
      botao.disabled = true;
      try {
        await postarConta(VJ.senhaDefinirUrl, { u: login, chave, senha: String(f.get('senha')) });
        location.reload(); // já volta logado
      } catch (err) {
        erro(err.message);
        botao.disabled = false;
      }
    });
  }
}

async function iniciar() {
  await atualizarSessao();
  sessao = lerSessao();
  iniciarConta();

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
    const botao = e.target.querySelector('[type=submit]');
    botao.disabled = true;
    try {
      const r = await fetch(VJ.loginUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(f.get('email')).trim(), senha: String(f.get('senha')) }),
      });
      if (!r.ok) throw new Error();
      location.reload();
    } catch {
      $('#login-erro').hidden = false;
      botao.disabled = false;
    }
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
  for (const k of ['tipo', 'marca', 'uf', 'preco', 'ano', 'ordem'])
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
  // Celular: filtros em tela cheia (estilo Webmotors).
  const fecharFiltros = () => document.body.classList.remove('filtros-abertos');
  $('#abrir-filtros').onclick = () => document.body.classList.add('filtros-abertos');
  $('#fechar-filtros').onclick = fecharFiltros;
  $('#ver-resultados').onclick = () => { fecharFiltros(); $('#contagem').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharFiltros());
  $('#limpar').onclick = () => {
    Object.assign(estado, { q: '', fontes: new Set(), tipo: '', marca: '', uf: '', preco: '', ano: '', mostrando: POR_PAGINA });
    $('#q').value = '';
    for (const k of ['tipo', 'marca', 'uf', 'preco', 'ano']) $('#f-' + k).value = '';
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
