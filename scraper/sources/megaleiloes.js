// Mega Leilões — categoria /veiculos/carros (HTML renderizado no servidor).
import { get, clean, brl, dataBR, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://www.megaleiloes.com.br';
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
export const fonte ={ id: 'megaleiloes', nome: 'Mega Leilões', site: BASE };

function parseCard(key, html) {
  const href = html.match(/class="card-title" href="([^"?]+)/)?.[1];
  if (!href) return null;
  const nome = clean(html.match(/class="card-title"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '').replace(/^(Direitos sobre )?Carro\s+/i, (m, d) => (d ? 'Direitos sobre ' : ''));
  const local = clean(html.match(/class="card-locality"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const [cidade, uf] = local.split(/,\s*/);
  const img = html.match(/data-bg="([^"]+)"/)?.[1];
  const status = clean(html.match(/class="card-status">([\s\S]*?)<\/div>/)?.[1] || '');

  const instancias = [...html.matchAll(/<div class="instance([^"]*)">([\s\S]*?)<\/div>/g)].map(([, cls, b]) => {
    const t = clean(b);
    const d = t.match(/(\d{2}\/\d{2}\/\d{4})\s*às\s*(\d{2}:\d{2})/);
    return { ativa: /active/.test(cls), passada: /passed/.test(cls), data: d ? dataBR(d[1], d[2]) : null, valor: brl(t.match(/R\$\s*[\d.,]+/)?.[0]) };
  });
  const ativa = instancias.find((i) => i.ativa) || instancias.find((i) => !i.passada) || instancias.at(-1) || {};
  const texto = clean(html);
  const natureza = /Extrajudicial/i.test(texto) ? 'Extrajudicial' : /Judicial/i.test(texto) ? 'Judicial' : null;
  const desconto = texto.match(/(\d+)%\s*abaixo/)?.[1];

  return {
    id: `megaleiloes-${key}`,
    fonte: fonte.id,
    titulo: limparTitulo(nome.replace(/\s*-\s*(19|20)\d{2}(\/(19|20)\d{2}|\d{4})?\s*$/, '')),
    tituloOriginal: nome,
    marca: marcaDe(nome),
    ano: anoDe(nome),
    km: null,
    cidade: cidade && !/sem informa/i.test(cidade) ? titulo(cidade) : null,
    uf: UFS.includes((uf || '').toUpperCase()) ? uf.toUpperCase() : null,
    lance: ativa.valor ?? brl(clean(html.match(/class="card-price">([\s\S]*?)<\/div>/)?.[1] || '')),
    lanceInicial: instancias[0]?.valor ?? null,
    valorMercado: null,
    desconto: desconto ? +desconto : null,
    encerra: ativa.data || null,
    status: status || null,
    natureza,
    comitente: null,
    lotes: 1,
    codigo: clean(html.match(/class="card-number[^"]*">([\s\S]*?)<\/div>/)?.[1] || '') || null,
    imagem: img ? img.replace(/_320x240\./, '_640x480.') : null,
    url: href,
  };
}

export async function coletar({ maxPaginas = 20 } = {}) {
  const itens = [];
  const vistos = new Set();
  for (let p = 1; p <= maxPaginas; p++) {
    const html = await (await get(`${BASE}/veiculos/carros?pagina=${p}`)).text();
    const blocos = [...html.matchAll(/<div class="col-sm-6 col-md-4 col-lg-3" data-key="(\d+)">([\s\S]*?)(?=<div class="col-sm-6 col-md-4 col-lg-3" data-key=|<div class="text-center pagination-bottom|$)/g)];
    let novos = 0;
    for (const [, key, bloco] of blocos) {
      if (vistos.has(key)) continue;
      vistos.add(key);
      const it = parseCard(key, bloco);
      if (!it) continue;
      novos++;
      if (/encerrad|cancelad|suspens|vendido|arrematad/i.test(it.status || '')) continue;
      if (!ehCarro(it.tituloOriginal, { categoriaCarro: true })) continue;
      itens.push(it);
    }
    if (!novos || !html.includes(`pagina=${p + 1}`)) break;
  }
  return itens;
}
