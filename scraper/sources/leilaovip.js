// Leilão VIP — agenda filtrada pelo segmento "Veículos".
// A página /agenda carrega a lista via POST em /agenda?handler=pesquisarEventos
// (HTML parcial, 24 cards por página). Precisa do cookie de "canal" que o site
// define no primeiro acesso.
import { get, clean, decode, brl, dataBR, marcaDe, anoDe, limparTitulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://www.leilaovip.com.br';
export const fonte = { id: 'leilaovip', nome: 'Leilão VIP', site: BASE };

async function cookieCanal() {
  // /agenda redireciona p/ /canal, que grava o cookie __CBCanal e volta p/ /agenda.
  const res = await get(`${BASE}/canal?returnUrl=%2Fagenda`, { redirect: 'manual', delay: 0 });
  const set = (res.headers.getSetCookie?.() || []).filter((c) => !/expires=Thu, 01 Jan 1970/i.test(c));
  return set.map((c) => c.split(';')[0]).join('; ');
}

function parseCard(html) {
  const href = html.match(/<a href="(\/evento\/detalhes\/[^"]+)"/)?.[1];
  if (!href) return null;
  const tituloRaw = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '');
  const nome = tituloRaw.replace(/\s*-\s*\(\d+\)\s*$/, '').trim();
  const status = clean(html.match(/<div class="situacao[^"]*">([\s\S]*?)<\/div>/)?.[1] || '');
  const img = html.match(/<img[^>]+src="([^"]+)"[^>]*class="card-img-top/)?.[1];

  // Praças: cada .anc-event tem data, hora e (às vezes) valor.
  // (a 1ª praça às vezes vem sem horário, então cada bloco .anc-event é lido separadamente)
  const pracas = html
    .split('<div class="anc-event">')
    .slice(1)
    .map((b) => b.split('<div class="anc-footer">')[0])
    .map((bloco) => ({
      data: dataBR(clean(bloco.match(/anc-date[^>]*>([\s\S]*?)<\/span>/)?.[1] || ''), clean(bloco.match(/anc-hour[^>]*>([\s\S]*?)<\/span>/)?.[1] || '')),
      valor: brl(bloco.match(/R\$\s*[\d.,]+/)?.[0]),
      passada: /anc-past/.test(bloco),
    }));
  // fallback p/ layout de leilão único: "Até: 24/09/2026 15:00" / "Leilão Único: 24/09/2026"
  if (!pracas.length) {
    const t = clean(html);
    const m = t.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})?/);
    if (m) pracas.push({ data: dataBR(m[1], m[2]), valor: brl(t.match(/R\$\s*[\d.,]+/)?.[0]), passada: false });
  }
  const ativa = pracas.find((p) => !p.passada) || pracas[pracas.length - 1] || {};
  const primeira = pracas[0] || {};

  const texto = clean(html);
  const lotes = +(texto.match(/(\d+)\s+Lotes?/)?.[1] || 1);
  const natureza = /Extrajudicial/i.test(texto) ? 'Extrajudicial' : /Judicial/i.test(texto) ? 'Judicial' : null;
  const comitente = decode(html.match(/anc-right-ft">\s*<img[^>]+alt="([^"]*)"/)?.[1] || '') || null;
  const codigo = texto.match(/Cód\.\s*([\w-]+)/)?.[1];

  return {
    id: `leilaovip-${href.split('/').pop()}`,
    fonte: fonte.id,
    titulo: limparTitulo(nome),
    tituloOriginal: nome,
    marca: marcaDe(nome),
    ano: anoDe(nome),
    km: null,
    cidade: null,
    uf: null,
    lance: ativa.valor ?? null,
    lanceInicial: primeira.valor ?? null,
    segundaPraca: pracas.length > 1 ? pracas[1].valor ?? null : null,
    valorMercado: null,
    encerra: ativa.data || null,
    status: status || null,
    natureza,
    comitente,
    lotes,
    codigo,
    imagem: img || null,
    url: BASE + href,
  };
}

export async function coletar({ maxPaginas = 15 } = {}) {
  const cookie = await cookieCanal();
  const itens = [];
  for (let p = 1; p <= maxPaginas; p++) {
    const res = await get(`${BASE}/agenda?handler=pesquisarEventos`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${BASE}/agenda`,
      },
      body: new URLSearchParams({ 'Filtro.Segmento': 'Veículos', 'Filtro.CurrentPage': String(p) }).toString(),
    });
    const html = await res.text();
    const cards = html.split(/<div class="card-evento /).slice(1);
    if (!cards.length) break;
    for (const c of cards) {
      const it = parseCard(c);
      if (!it) continue;
      if (/encerrad|cancelad|suspens|vendido|arrematad/i.test(it.status || '')) continue;
      if (!ehCarro(it.tituloOriginal)) continue;
      itens.push(it);
    }
    if (!/pageNumber=\d+[^"]*"[^>]*>\s*(&gt;|›|»|Próx)/i.test(html) && !html.includes(`pageNumber=${p + 1}`)) break;
  }
  return itens;
}
