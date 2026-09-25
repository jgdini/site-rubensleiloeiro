// Portal Zuk — seção /leilao-de-veiculos (o site é focado em imóveis, mas tem veículos judiciais do TJSP/TJSC/TJPR).
//   GET  /leilao-de-veiculos           -> 30 primeiros cards + _token (Laravel) + cookies de sessão
//   POST /leilao-de-imoveis/mais       -> próximos 30 (count_imovel_zuk = quantos já vieram)
// O comitente vem no alt da foto ("... - Tribunal de Justiça do Estado de São Paulo | Z37188").
import { get, clean, decode, brl, dataBR, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { tipoVeiculo } from '../classify.js';

const BASE = 'https://www.portalzuk.com.br';
const PAGINA = `${BASE}/leilao-de-veiculos`;
export const fonte = { id: 'zuk', nome: 'Portal Zuk', site: PAGINA };

const JUDICIAL = /TRIBUNAL|JUSTI[CÇ]A|\bVARA\b|\bTRT\b|JU[IÍ]ZO|FORO/i;

function parseCards(html) {
  return html
    .split(/<div class="card-property card_lotes_div"/)
    .slice(1)
    .map((c) => {
      const url = c.match(/href="(https:\/\/www\.portalzuk\.com\.br\/veiculo\/[\d-]+)"/)?.[1];
      if (!url) return null;
      const alt = decode(c.match(/<img[^>]+alt="([^"]*)"/)?.[1] || '');
      const desc = decode(c.match(/<span[^>]*title="([^"]+)"/)?.[1] || '');
      const endereco = clean(c.match(/<span style="flex-basis: 100%;[^"]*">([\s\S]*?)<\/span>/)?.[1] || '');
      const [cidade, uf] = (endereco.split(/\s+-\s+/)[0] || '').split(/\s*\/\s*/);
      const pracas = [...c.matchAll(/<li class="card-property-price"[^>]*>\s*<span class="card-property-price-label"\s*>\s*([^<]+?)\s*<\/span>\s*<span class="card-property-price-value">\s*(R\$\s*[\d.,]+)[\s\S]*?<span class="card-property-price-data">\s*([^<]+)/g)].map(
        ([, rot, valor, data]) => {
          const d = data.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:às)?\s*(\d{2}:\d{2})?/);
          return { rot: rot.trim(), valor: brl(valor), data: d ? dataBR(d[1], d[2]) : null };
        }
      );
      const comitente = (alt.split(/\s+-\s+/).pop() || '').replace(/\s*\|.*$/, '').trim();
      return { url, alt, desc, cidade, uf, pracas, comitente, imagem: c.match(/<img[^>]+src="([^"]+)"/)?.[1] };
    })
    .filter(Boolean);
}

function modelo(desc) {
  // "Carro, GM/ASTRA HB 4P ELEGANCE, flex, cor bege, 2004/2005, placa BBB0571."
  // "Automovel marca Fiat, modelo Uno ..." / "LOTE 01: 1 VEÍCULO VOLKSWAGEN 25-370 ..."
  let s = desc
    .replace(/^LOTE \d+\s*:\s*/i, '')
    .replace(/^\d+\s+/, '')
    .replace(/^(carro|autom[oó]vel|ve[ií]culo|caminhonete|picape|suv|direitos do fiduciante)\s*[,:-]?\s*/i, '')
    .replace(/^(marca\s+)/i, '');
  s = s.split(/,\s*(?:flex|gasolina|diesel|[aá]lcool|cor|placa|ano|renavam|chassi|\d{4}\/\d{4})\b/i)[0];
  return limparTitulo(s.replace(/\s*,\s*modelo\s*/i, ' ').replace(/(\w)\s*\/\s*(\w)/g, '$1 $2').replace(/\.$/, ''));
}

function mapear(c) {
  const agora = Date.now();
  const ativa = c.pracas.find((p) => p.data && new Date(p.data) > agora) || c.pracas.at(-1) || {};
  const primeira = c.pracas[0] || {};
  const segunda = c.pracas[1] || null;
  const id = c.url.split('/').pop();
  return {
    id: `zuk-${id}`,
    fonte: fonte.id,
    titulo: modelo(c.desc) || 'Veículo (detalhes no edital)',
    tituloOriginal: c.desc,
    marca: marcaDe(c.desc.replace(/\//g, ' ')),
    ano: anoDe(c.desc),
    km: null,
    cidade: c.cidade ? titulo(c.cidade.trim()) : null,
    uf: c.uf?.trim().slice(0, 2).toUpperCase() || null,
    lance: ativa.valor ?? null,
    lanceInicial: primeira.valor ?? null,
    segundaPraca: segunda?.valor ?? null,
    lances: 0,
    valorMercado: null,
    desconto: segunda?.valor && primeira.valor > segunda.valor ? Math.round((1 - segunda.valor / primeira.valor) * 100) : null,
    comissao: null,
    encerra: ativa.data || null,
    status: 'Aberto para lances',
    natureza: JUDICIAL.test(c.comitente) ? 'Judicial' : 'Extrajudicial',
    comitente: c.comitente || null,
    lotes: 1,
    codigo: c.alt.match(/\|\s*(Z\d+)/)?.[1] || null,
    imagem: c.imagem || null,
    url: c.url,
  };
}

export async function coletar({ max = 600 } = {}) {
  const res = await get(PAGINA);
  const html = await res.text();
  const cookie = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  const token = (html.match(/name=["']_token["'][^>]*value=["']([^"']+)/) || html.match(/value=["']([^"']+)["'][^>]*name=["']_token/))?.[1] || '';

  const cards = parseCards(html);
  while (cards.length < max) {
    const body = new URLSearchParams({ limit: 30, count_imovel_zuk: cards.length, path: PAGINA, order: 'data_leilao', div_parceiro_count: 0, _token: token });
    const r = await get(`${BASE}/leilao-de-imoveis/mais`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token, Referer: PAGINA },
      body: body.toString(),
    });
    const novos = parseCards(await r.text()).filter((n) => !cards.some((c) => c.url === n.url));
    if (!novos.length) break;
    cards.push(...novos);
  }

  return cards
    .map((c) => ({ ...mapear(c), tipo: tipoVeiculo(c.desc, c.desc.split(/[,:]/)[0]) }))
    .filter((l) => l.tipo);
}
