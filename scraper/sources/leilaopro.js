// Leiloeiros (listas PR/SC/RS do Rubens) na plataforma "Leilão Pro" (ícone #icon-leilaopro).
//   GET /leilao/lotes/veiculos                     -> links /leilao/{slug-do-leilão}/lote_id/{id}
//   GET /leilao/{slug}/lote_id/{id}                -> JSON-LD (nome, preço, encerramento) + textos "LANCE INICIAL 1º/2º LEILÃO", "COMISSÃO"
// O slug do leilão diz o comitente ("justica-civel-de-capao-da-canoa…", "prefeitura-municipal-de…"); só os judiciais são abertos.
import { get, sleep, brl, marcaDe, anoDe, titulo, limparTitulo, decode } from '../lib.js';
import { tipoVeiculo } from '../classify.js';

export const fonte = { id: 'leilaopro', nome: 'Leiloeiros PR/SC/RS', site: 'https://www.leilao.pro' };

export const SITES = [
  'alegranzzileiloes.com.br', 'michelesandorleiloes.com.br', 'jacleiloes.com.br', 'leffaleiloes.com.br',
  'qleilao.lel.br', 'renovarleiloes.com.br', 'sabbagleiloes.com.br', 'soleiloes.com.br',
];

const JUDICIAL = /justica|vara-|tribunal|juizo|juizado|forum|foro-|\btrt|tj[a-z]{2}\b|comarca|judicial/;
const NOMES = { 'qleilao.lel.br': 'Q Leilão', 'michelesandorleiloes.com.br': 'Michele Sandor Leilões', 'soleiloes.com.br': 'SO Leilões', 'jacleiloes.com.br': 'JAC Leilões' };
const nomeSite = (d) => NOMES[d] || titulo(d.replace(/\.com\.br$|\.lel\.br$/, '').replace(/leiloes$/, ' Leilões')).trim();

function linhas(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => decode(s).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
const depois = (ls, re) => { const i = ls.findIndex((s) => re.test(s)); return i >= 0 ? ls[i + 1] : null; };

/** "UM VEÍCULO RENAULT/LOGAN EXP 16, COR PRETA, PLACAS …, ANO/MODELO 2008/2008" -> "RENAULT/LOGAN EXP 16" */
function nomeCurto(s) {
  return s
    .replace(/^(0?1|um|uma)\s*(\(um\)|\(uma\))?\s*/i, '')
    .replace(/^(ve[ií]culo|autom[oó]vel|motocicleta|caminh[aã]o|carro)\s*(marca\s*)?[:,-]?\s*/i, '')
    .split(/,\s*(?:cor|placa|placas|ano|chassi|renavam|modelo\s+\d)/i)[0]
    .replace(/\s*-\s*$/, '')
    .trim();
}

async function detalhe(dom, base, url) {
  const html = await (await get(url, { delay: 250 })).text();
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const grafo = ld ? JSON.parse(ld)['@graph'] || [] : [];
  const prod = grafo.find((g) => g['@type'] === 'Product') || {};
  const evento = grafo.find((g) => g['@type'] === 'Event') || {};
  const ls = linhas(html);
  // Nome genérico ("Veículos"): usa a descrição do produto ou o primeiro parágrafo de DESCRIÇÃO.
  const generico = (s) => !s || /^(ve[ií]culos?|lote \d+|autom[oó]veis|bens m[oó]veis)\s*:?$/i.test(s.trim());
  const iDesc = ls.findIndex((s) => /^DESCRI[CÇ][AÃ]O$/i.test(s));
  // "Leilão Judicial / Gol CL e Caminhão M.Benz 709" -> parte depois da barra
  const doEvento = (evento.name || '').split('/').slice(1).join('/').trim();
  const nomeCompleto = [prod.name, prod.description, doEvento, iDesc >= 0 ? ls[iDesc + 2] : null].map((s) => decode(s || '')).find((s) => !generico(s)) || decode(prod.name || '');
  const nome = nomeCurto(nomeCompleto);
  const v1 = brl(depois(ls, /^LANCE INICIAL 1[ºª] (LEIL[AÃ]O|DATA|PRA[CÇ]A)$/i));
  const v2 = brl(depois(ls, /^LANCE INICIAL 2[ºª] (LEIL[AÃ]O|DATA|PRA[CÇ]A)$/i));
  const iCom = ls.findIndex((s) => /^COMISS[AÃ]O$/i.test(s));
  const pct = iCom >= 0 ? +(ls.slice(iCom + 1, iCom + 3).join(' ').match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(',', '.') || 0) || null : null;
  const encerra = prod.offers?.validThrough || null;
  const ev = decode(evento.name || '');
  const m = ev.match(/\bde ([A-ZÀ-Ú][A-Za-zÀ-ú' ]{2,40}?)\s*(?:[A-Z]{2,4}\s+)?(?:-|\/)?\s*([A-Z]{2})\s*$/);
  const foto = html.match(/id="mainImageJudicial"[^>]*src="([^"]+)"/)?.[1] || html.match(/class="main-image"[^>]*src="([^"]+)"/)?.[1];
  return {
    id: `leilaopro-${dom}-${url.match(/lote_id\/(\d+)/)?.[1]}`,
    fonte: fonte.id,
    titulo: limparTitulo(nome.replace(/\//g, ' ')),
    tituloOriginal: nomeCompleto,
    marca: marcaDe(nome.replace(/\//g, ' ')),
    ano: anoDe(nomeCompleto),
    km: null,
    cidade: m ? titulo(m[1].trim()) : null,
    uf: m ? m[2] : null,
    lance: v1 || +prod.offers?.price || null,
    lanceInicial: v1,
    segundaPraca: v2,
    lances: 0,
    valorMercado: null,
    desconto: v1 && v2 && v2 < v1 ? Math.round((1 - v2 / v1) * 100) : null,
    comissao: pct,
    encerra,
    status: 'Aberto para lances',
    natureza: 'Judicial',
    comitente: ev ? titulo(ev) : null,
    leiloeiro: nomeSite(dom),
    leiloeiroSite: dom,
    lotes: 1,
    codigo: prod.sku || null,
    imagem: foto && !/nopicture/i.test(foto) ? new URL(foto, base).href : null,
    url,
  };
}

async function coletarSite(dom) {
  const res = await get(`https://www.${dom}/leilao/lotes/veiculos`, { delay: 200 });
  const base = new URL(res.url).origin;
  const html = await res.text();
  const links = [...new Set([...html.matchAll(/href="(\/leilao\/([^/"]+)\/lote_id\/\d+)"/g)].filter(([, , slug]) => JUDICIAL.test(slug) && !/extrajudicial/.test(slug)).map(([, h]) => base + h))];
  const itens = [];
  for (const url of links) {
    try {
      const lote = await detalhe(dom, base, url);
      if (lote.encerra && new Date(lote.encerra) < Date.now()) continue;
      const tipo = tipoVeiculo(lote.tituloOriginal);
      if (!tipo) continue;
      itens.push({ ...lote, tipo });
    } catch {}
  }
  return itens;
}

export async function coletar() {
  const itens = [];
  const falhas = [];
  const fila = [...SITES];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (fila.length) {
        const dom = fila.shift();
        try {
          itens.push(...(await coletarSite(dom)));
        } catch (e) {
          falhas.push(`${dom} (${e.message.slice(0, 40)})`);
        }
        await sleep(200);
      }
    })
  );
  if (falhas.length) console.warn(`  ↳ Leilão Pro: ${falhas.length} site(s) sem resposta: ${falhas.join(', ')}`);
  return itens;
}
