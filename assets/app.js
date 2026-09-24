const CORES = { leilo: '#7c5cff', megaleiloes: '#ff5a1f', leilaovip: '#2ecc71' };
const POR_PAGINA = 36;

const $ = (s) => document.querySelector(s);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: n % 1 ? 2 : 0 });
const km = (n) => n.toLocaleString('pt-BR') + ' km';
const semAcento = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const estado = { q: '', fontes: new Set(), marca: '', uf: '', preco: '', ano: '', ordem: 'encerra', mostrando: POR_PAGINA };
let dados = { lotes: [], fontes: [] };
let nomesFonte = {};

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
  return l.valorMercado && l.lance ? Math.round((1 - l.lance / l.valorMercado) * 100) : null;
}

function filtrar() {
  const termos = semAcento(estado.q).split(/\s+/).filter(Boolean);
  let r = dados.lotes.filter((l) => {
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
  }[estado.ordem];
  return r.sort(ord);
}

function card(l) {
  const el = $('#tpl-card').content.firstElementChild.cloneNode(true);
  el.href = l.url;
  el.style.setProperty('--c', CORES[l.fonte]);
  el.setAttribute('aria-label', `${l.titulo} — ver no ${nomesFonte[l.fonte]}`);

  const foto = el.querySelector('.card__foto');
  const img = foto.querySelector('img');
  if (l.imagem) {
    img.src = l.imagem;
    img.alt = l.titulo;
    img.onload = () => foto.classList.add('ok');
    img.onerror = () => foto.classList.add('ok', 'sem');
  } else foto.classList.add('ok', 'sem');

  el.querySelector('.card__fonte').textContent = nomesFonte[l.fonte];
  const t = tempoRestante(l.encerra);
  const tempo = el.querySelector('.card__tempo');
  tempo.textContent = t.txt;
  tempo.classList.toggle('urgente', t.urgente);
  if (l.encerra) tempo.dataset.iso = l.encerra;

  el.querySelector('.card__titulo').textContent = l.titulo;
  const specs = [l.ano, l.km != null ? km(l.km) : null, l.cidade ? `${l.cidade}${l.uf ? '/' + l.uf : ''}` : l.uf].filter(Boolean);
  el.querySelector('.card__specs').innerHTML = specs.map((s) => `<span>${String(s).replace(/</g, '&lt;')}</span>`).join('') || '<span>Detalhes no anúncio</span>';

  const valor = el.querySelector('.card__valor');
  const rotulo = el.querySelector('.card__rotulo');
  if (l.lance) {
    rotulo.textContent = l.lances ? `Lance atual · ${l.lances} lance${l.lances > 1 ? 's' : ''}` : l.lotes > 1 ? 'A partir de' : 'Lance mínimo';
    valor.textContent = brl(l.lance);
  } else {
    rotulo.textContent = l.lotes > 1 ? `${l.lotes} lotes neste leilão` : 'Valor';
    valor.textContent = 'Ver valores no leilão';
    valor.classList.add('sem');
  }
  const d = desconto(l);
  el.querySelector('.card__fipe').textContent = d > 0 ? `−${d}% vs. valor de mercado` : l.desconto ? `${l.desconto}% abaixo da 1ª praça` : '';
  el.querySelector('.card__natureza').textContent = [l.natureza, l.comitente].filter(Boolean).join(' · ') || l.status || '';
  return el;
}

function render() {
  const lista = filtrar();
  const grade = $('#grade');
  grade.replaceChildren(...lista.slice(0, estado.mostrando).map(card));
  $('#contagem').innerHTML = `<b>${lista.length.toLocaleString('pt-BR')}</b> ${lista.length === 1 ? 'carro encontrado' : 'carros encontrados'}`;
  $('#mais').hidden = lista.length <= estado.mostrando;
  $('#vazio').hidden = lista.length > 0;

  const ativo = estado.q || estado.fontes.size || estado.marca || estado.uf || estado.preco || estado.ano;
  $('#limpar').hidden = !ativo;
  for (const [id, k] of [['#f-marca', 'marca'], ['#f-uf', 'uf'], ['#f-preco', 'preco'], ['#f-ano', 'ano']]) $(id).classList.toggle('ativo', !!estado[k]);
  document.querySelectorAll('.chip[data-fonte]').forEach((c) => c.setAttribute('aria-pressed', estado.fontes.has(c.dataset.fonte)));
  salvarURL();
}

function opcoes(sel, valores, rotulo = (v) => v) {
  const s = $(sel);
  for (const [v, n] of valores) s.add(new Option(`${rotulo(v)} (${n})`, v));
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
  $('#q').value = estado.q;
  for (const k of ['marca', 'uf', 'preco', 'ano', 'ordem']) $('#f-' + k).value = estado[k];
}

async function iniciar() {
  try {
    dados = await (await fetch('data/lotes.json', { cache: 'no-cache' })).json();
  } catch {
    $('#meta').textContent = 'Não foi possível carregar os anúncios agora.';
    return;
  }
  nomesFonte = Object.fromEntries(dados.fontes.map((f) => [f.id, f.nome]));

  $('#meta').innerHTML = `<span class="pulso"></span>${dados.total.toLocaleString('pt-BR')} carros · ${dados.fontes.length} leiloeiros · atualizado ${relativo(dados.geradoEm)}`;

  const fontesEl = $('#fontes');
  for (const f of dados.fontes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.fonte = f.id;
    b.style.setProperty('--c', CORES[f.id]);
    b.innerHTML = `<span class="ponto"></span>${f.nome}<small>${f.total}</small>`;
    b.onclick = () => {
      estado.fontes.has(f.id) ? estado.fontes.delete(f.id) : estado.fontes.add(f.id);
      estado.mostrando = POR_PAGINA;
      render();
    };
    fontesEl.append(b);
  }
  $('#rodape-fontes').innerHTML =
    'Fontes: ' + dados.fontes.map((f) => `<a href="${f.site}" target="_blank" rel="noopener nofollow">${f.nome}</a>`).join(' · ');

  opcoes('#f-marca', contar('marca').sort((a, b) => a[0].localeCompare(b[0])));
  opcoes('#f-uf', contar('uf').sort((a, b) => a[0].localeCompare(b[0])));
  lerURL();

  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => ((estado.q = e.target.value.trim()), (estado.mostrando = POR_PAGINA), render()), 150);
  });
  for (const k of ['marca', 'uf', 'preco', 'ano', 'ordem'])
    $('#f-' + k).addEventListener('change', (e) => ((estado[k] = e.target.value), (estado.mostrando = POR_PAGINA), render()));
  $('#mais').onclick = () => ((estado.mostrando += POR_PAGINA), render());
  $('#limpar').onclick = () => {
    Object.assign(estado, { q: '', fontes: new Set(), marca: '', uf: '', preco: '', ano: '', mostrando: POR_PAGINA });
    $('#q').value = '';
    for (const k of ['marca', 'uf', 'preco', 'ano']) $('#f-' + k).value = '';
    render();
  };
  render();
  // Atualiza as contagens regressivas a cada minuto (sem redesenhar os cards).
  setInterval(() => {
    document.querySelectorAll('.card__tempo[data-iso]').forEach((el) => {
      const t = tempoRestante(el.dataset.iso);
      el.textContent = t.txt;
      el.classList.toggle('urgente', t.urgente);
    });
  }, 60000);
}

iniciar();
