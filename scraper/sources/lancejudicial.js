// Lance Judicial / Grupo Lance — categoria /veiculos/carros (HTML renderizado no servidor).
import { get, clean, brl, dataBR, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://www.grupolance.com.br';
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
export const fonte = { id: 'lancejudicial', nome: 'Lance Judicial', site: 'https://www.lancejudicial.com.br' };

function parseCard(key, html) {
  const href = html.match(/class="card-title" href="([^"]+)"/)?.[1];
  if (!href) return null;
  const nome = clean(html.match(/class="card-title"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const local = clean(html.match(/class="card-locality"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const [cidade, uf] = local.split(/,\s*/);
  const img = html.match(/class="card-image[^"]*"[^>]*url\(([^)]+)\)/)?.[1];
  const status = clean(html.match(/class="card-status[^"]*">([\s\S]*?)<\/span>/)?.[1] || '');

  // Cada praça: início, fim e valor.
  const agora = Date.now();
  const pracas = [...html.matchAll(/<ol class="card-instance-date">([\s\S]*?)<\/ol>/g)].map(([, b]) => {
    const lis = [...b.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1]));
    const fim = lis[1]?.match(/(\d{2}\/\d{2}\/\d{4})\s*às\s*(\d{2}:\d{2})/);
    const data = fim ? dataBR(fim[1], fim[2]) : null;
    return { data, valor: brl(lis[2]), passada: data ? new Date(data).getTime() < agora : false };
  });
  const ativa = pracas.find((p) => !p.passada) || pracas.at(-1) || {};
  const texto = clean(html);
  const natureza = /Extrajudicial/i.test(texto) ? 'Extrajudicial' : /Judicial/i.test(texto) ? 'Judicial' : null;
  const desconto = texto.match(/(\d+)%\s*abaixo/)?.[1];
  const nomeLimpo = nome
    .replace(/^(direitos? (do|sobre( um)?)\s+)?ve[ií]culos?\s*(i\s*\/\s*|importado\s+)?/i, (m, d) => (d ? 'Direitos sobre ' : ''))
    .replace(/\s*\/\s*/, ' ')
    .replace(/,\s*(cor\s+)?(preto|preta|branco|branca|prata|cinza|vermelho|vermelha|azul|verde|bege|dourado|marrom|amarelo|vinho)\b.*$/i, '')
    .replace(/,?\s*(ano\/?modelo|ano)\s*[\d/ ]+.*$/i, '')
    .replace(/,\s*\d{4}\/\d{4}.*$/, '');

  return {
    id: `lancejudicial-${key}`,
    fonte: fonte.id,
    titulo: limparTitulo(nomeLimpo),
    tituloOriginal: nome,
    marca: marcaDe(nome.replace(/\bI\s*\//, '')),
    ano: anoDe(nome.replace(/ano\/?modelo\s*/i, 'ano ')),
    km: null,
    cidade: cidade ? titulo(cidade) : null,
    uf: UFS.includes((uf || '').toUpperCase()) ? uf.toUpperCase() : null,
    lance: ativa.valor ?? brl(clean(html.match(/class="card-price">([\s\S]*?)<\/div>/)?.[1] || '')),
    lanceInicial: pracas[0]?.valor ?? null,
    segundaPraca: pracas[1]?.valor ?? null,
    valorMercado: null,
    desconto: desconto ? +desconto : null,
    encerra: ativa.data || null,
    status: status || null,
    natureza,
    comitente: null,
    lotes: 1,
    codigo: key,
    imagem: img ? (img.startsWith('//') ? 'https:' + img : img).replace(/_thumb\.(jpe?g|png)$/i, '.$1') : null,
    url: href.startsWith('http') ? href : BASE + href,
  };
}

export async function coletar({ maxPaginas = 20 } = {}) {
  const itens = [];
  const vistos = new Set();
  for (let p = 1; p <= maxPaginas; p++) {
    const html = await (await get(`${BASE}/veiculos/carros?pagina=${p}`)).text();
    const blocos = html.split(/<div class="card-item [^"]*" data-key="/).slice(1);
    let novos = 0;
    for (const b of blocos) {
      const key = b.match(/^(\d+)"/)?.[1];
      if (!key || vistos.has(key)) continue;
      vistos.add(key);
      const it = parseCard(key, b);
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
