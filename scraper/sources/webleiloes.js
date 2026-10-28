// WebLeilões (webleiloes.com.br) — plataforma própria, diferente da Suporte Leilões padrão.
// Listagem: GET /veiculos?page=N  → cards com data-key, preços e timestamps Unix
// Detalhe: não é necessário — os cards já trazem todos os dados úteis.
import { get, sleep, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { tipoVeiculo } from '../classify.js';

export const fonte = { id: 'webleiloes', nome: 'Web Leilões', site: 'https://www.webleiloes.com.br' };

const BASE = 'https://www.webleiloes.com.br';
// Meses JS são 0-indexed; o countdown usa new Date(yyyy, M, d, h, m, s)
const jsDateToIso = (s) => {
  const m = s.match(/new Date\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  const [, y, mo, d, h, mi, sec] = m.map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(sec)}-03:00`;
};

// "R$ 28.763,70" → 28763.70
const parseBRL = (s) => {
  const n = s.replace(/[^\d,]/g, '').replace(',', '.');
  return n ? +n : null;
};

// timestamp Unix (segundos) → ISO -03:00
const unixToIso = (ts) => {
  const d = new Date(+ts * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const tzo = -180; // UTC-3
  const sign = tzo < 0 ? '-' : '+';
  const abs = Math.abs(tzo);
  const local = new Date(d.getTime() + tzo * 60000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

function parseCard(bloco) {
  try {
    const id = bloco.match(/data-key="(\d+)"/)?.[1];
    if (!id) return null;

    // URL e título
    const href = bloco.match(/card-title stretched-link[^>]+href="([^"]+)"/)?.[1];
    const tituloRaw = bloco.match(/card-title[^>]+title="([^"]+)"/)?.[1] || '';
    if (!href || !tituloRaw) return null;
    const url = href.startsWith('http') ? href : BASE + href;

    // Tipo pelo segmento de URL: /veiculos/carros/ /veiculos/motos/ etc.
    const segmento = href.match(/\/veiculos\/([^/]+)\//)?.[1] || '';

    // Cidade e UF: "Bauru, SP"
    const localStr = bloco.match(/card-locality[^>]+title="([^"]+)"/)?.[1] || '';
    const [cidade, uf] = localStr.split(',').map((s) => s.trim());

    // Código do lote: "25950 · Lote 1"
    const codMatch = bloco.match(/card-batch-id[^>]*>[^<]*<\/a>\s*(\d+)\s*·\s*(Lote\s*\d+)/);
    const codigo = bloco.match(/·\s*(Lote\s*\d+)/)?.[1]?.trim() || null;

    // Imagem (thumb → full)
    const imgMatch = bloco.match(/card-image[^>]+url\(([^)]+)\)/);
    const imagem = imgMatch ? imgMatch[1].replace(/^\/\//, 'https://').replace(/_thumb(\.[a-z]+)$/, '$1') : null;

    // Status: open ou waiting
    const statusRaw = bloco.match(/card-status\s+(\w+)\s+badge/)?.[1];
    const status = statusRaw === 'open' ? 'Aberto para lances' : null;

    // Praças: cada <div class="card-batch-stage ..."> tem is-done/is-active
    const stages = [...bloco.matchAll(/<div class="card-batch-stage([^"]*)"[^>]*data-stage-end="(\d+)">([\s\S]*?)<\/div>\s*(?=<div class="card-batch-stage|<\/div>\s*<\/div>\s*<div class="card-body)/g)];
    // Fallback: coleta todos os stages sem lookahead estrito
    const allStages = [...bloco.matchAll(/card-batch-stage([^"]*)"[^>]+data-stage-end="(\d+)"/g)];

    let v1 = null, v2 = null, encerra1 = null, encerra2 = null;
    const stageBlocks = bloco.split(/card-batch-stage[^"]*"[^>]+data-stage-end="/).slice(1);
    for (let i = 0; i < stageBlocks.length; i++) {
      const sb = stageBlocks[i];
      const tsEnd = sb.match(/^(\d+)/)?.[1];
      const val = parseBRL(sb.match(/card-batch-stage-value[^>]*>([\s\S]*?)<\/span>/)?.[1] || '');
      const iso = tsEnd ? unixToIso(tsEnd) : null;
      if (i === 0) { v1 = val; encerra1 = iso; }
      else if (i === 1) { v2 = val; encerra2 = iso; }
    }

    // Preço atual (pode ser da 2ª praça se a 1ª já encerrou)
    const precoAtual = parseBRL(bloco.match(/card-price[^>]*>\s*(R\$[^<]+)/)?.[1] || '');

    // Encerramento da praça ativa
    const agora = Date.now();
    const enc1Date = encerra1 ? new Date(encerra1) : null;
    const enc2Date = encerra2 ? new Date(encerra2) : null;
    const encerra = (enc2Date && enc2Date > agora) ? encerra2
      : (enc1Date && enc1Date > agora) ? encerra1
      : encerra2 || encerra1;

    // Indica fim da 1ª praça (só quando há 2ª)
    const fimPraca1 = v2 ? encerra1 : null;

    // Lance atual = precoAtual se disponível, senão v1
    const lance = precoAtual || (enc1Date && enc1Date < agora ? v2 : v1);

    if (!encerra || new Date(encerra) < agora) return null;

    return {
      id: `webleiloes-${id}`,
      fonte: fonte.id,
      titulo: limparTitulo(tituloRaw.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ')),
      tituloOriginal: tituloRaw,
      marca: marcaDe(tituloRaw.replace(/\//g, ' ')),
      ano: anoDe(tituloRaw),
      km: null,
      cidade: cidade || null,
      uf: uf || null,
      lance,
      lanceInicial: v1,
      segundaPraca: v2,
      lances: 0,
      valorMercado: null,
      desconto: v2 && v1 && v2 < v1 ? Math.round((1 - v2 / v1) * 100) : null,
      comissao: null,
      encerra,
      fimPraca1,
      status,
      natureza: 'Judicial',
      comitente: null,
      leiloeiro: 'Web Leilões',
      leiloeiroSite: 'webleiloes.com.br',
      lotes: 1,
      codigo,
      imagem,
      url,
      _segmento: segmento,
    };
  } catch {
    return null;
  }
}

export async function coletar() {
  const itens = [];
  for (let p = 1; p <= 10; p++) {
    const url = p === 1 ? `${BASE}/veiculos` : `${BASE}/veiculos?page=${p}`;
    const html = await (await get(url, { delay: 300 })).text();
    const blocos = html.split('class="card-item ').slice(1);
    let novos = 0;
    for (const bloco of blocos) {
      const item = parseCard(bloco);
      if (!item) continue;
      const tipo = tipoVeiculo(item.tituloOriginal, item._segmento);
      if (!tipo) continue;
      const { _segmento, ...rest } = item;
      itens.push({ ...rest, tipo });
      novos++;
    }
    // Sem paginação real? O site retorna os mesmos lotes em páginas seguintes.
    // Para quando não há novos lotes diferentes dos já coletados.
    if (!novos || blocos.length === 0) break;
    // Webleiloes parece retornar tudo em página única — verifica se há próxima
    if (!html.includes(`page=${p + 1}`) && !html.includes('rel="next"')) break;
    await sleep(300);
  }
  return itens;
}
