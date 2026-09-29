// Leiloeiros (listas MG/PR/SC/SP do Rubens) que usam a plataforma "Suporte Leilões" (static.suporteleiloes.com.br).
//   GET /buscador?categoria=1&judicial=1&page=N   -> cards dos lotes (12 por página), só leilões judiciais
//   GET /eventos/leilao/{slug}/lote/{id}/{slug}  -> a página traz `var lote = {…}` com praças, valores, comissão, cidade e foto
import { get, sleep, marcaDe, anoDe, titulo, limparTitulo, decode } from '../lib.js';
import { tipoVeiculo } from '../classify.js';

export const fonte = { id: 'suporte', nome: 'Leiloeiros regionais', site: 'https://www.suporteleiloes.com.br' };

export const SITES = [
  'anandaleiloes.com.br', 'buaizleiloes.com.br', 'dhleiloes.com.br', 'darosleiloes.com.br', 'ggleiloes.com.br', 'goldenlance.com.br',
  'gustavoreisleiloes.com.br', 'jeleiloes.com.br', 'kleiberleiloes.com.br', 'lancevip.com.br', 'leilaobrasil.com.br', 'buenoleiloes.com.br',
  'liderleiloes.com.br', 'lilianportugal.com.br', 'lutheroleiloes.com.br', 'maisleilao.com.br', 'marianoleiloes.com.br', 'peterlongo.leilao.br',
  'ricardogomesleiloes.com.br', 'sandrasantosleiloes.com.br', 'saraivaleiloes.com.br', 'serpaleiloes.com.br', 'simoesleiloes.com.br',
  'trileiloes.com.br', 'unileiloes.com.br', 'valeroleiloes.com.br', 'vecchileiloes.com.br', 'webleiloes.com.br', 'wermelingerleiloes.com.br',
];

const NOMES = { 'peterlongo.leilao.br': 'Peterlongo Leilões', 'lancevip.com.br': 'Lance VIP', 'goldenlance.com.br': 'Golden Lance', 'maisleilao.com.br': 'Mais Leilão', 'leilaobrasil.com.br': 'Leilão Brasil' };
const nomeSite = (d) => NOMES[d] || titulo(d.replace(/\.com\.br$|\.com$|\.leilao\.br$/, '').replace(/leiloes$|leilao$/, ' Leilões')).trim();
const iso = (d) => (d?.date ? d.date.slice(0, 19).replace(' ', 'T') + '-03:00' : null);

/** Extrai o JSON `var lote = {…};` (fica numa linha só). */
function jsonLote(html) {
  const linha = html.split('\n').find((l) => l.trimStart().startsWith('var lote = {'));
  if (!linha) return null;
  try { return JSON.parse(linha.trim().replace(/^var lote = /, '').replace(/;\s*$/, '')); } catch { return null; }
}

function mapear(dom, url, sub, l) {
  const lei = l.leilao || {};
  const bem = l.stats?.lote?.bem || {};
  let nome = decode(bem.siteTitulo || l.descricao || '');
  // "VW/GOL 1.6 Power 2009-2010 - Aparecida/SP": a cidade vai pro campo próprio.
  const local = nome.match(/\s+-\s+([A-Za-zÀ-ú' .]{3,40}?)\s*\/\s*([A-Z]{2})\s*$/);
  if (local) nome = nome.slice(0, local.index);
  const v1 = l.valorInicial || null;
  const v2 = l.valorInicial2 || null;
  const e1 = iso(lei.data1), e2 = iso(lei.data2);
  const agora = Date.now();
  const encerra = [e1, e2].filter(Boolean).find((d) => new Date(d) > agora) || e2 || e1 || iso(l.dataFechamento);
  const lanceAtual = l.valorLanceAtual || l.lanceAtual?.valor || null;
  const pct = +(l.taxasCalculadas || []).find((t) => /comiss/i.test(t.imposto?.nome || ''))?.imposto?.valor || null;
  const foto = bem.image?.full?.url || bem.image?.min?.url || null;
  return {
    id: `suporte-${dom}-${l.id}`,
    fonte: fonte.id,
    titulo: limparTitulo(nome.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ')),
    tituloOriginal: [sub, nome].filter(Boolean).join(' — '),
    marca: marcaDe(nome.replace(/\//g, ' ')),
    ano: anoDe(nome),
    km: null,
    cidade: bem.cidade ? titulo(bem.cidade) : local ? titulo(local[1].trim()) : null,
    uf: bem.uf || local?.[2] || lei.leiloeiro?.uf || null,
    lance: lanceAtual || (v2 && e1 && new Date(e1) < agora ? v2 : v1),
    lanceInicial: v1,
    segundaPraca: v2,
    lances: l.stats?.lances || 0,
    valorMercado: l.valorMercado || null,
    desconto: l.valorAvaliacao && v2 && v2 < l.valorAvaliacao ? Math.round((1 - v2 / l.valorAvaliacao) * 100) : null,
    comissao: pct,
    encerra,
    status: l.status === 1 ? 'Aberto para lances' : null,
    natureza: lei.judicial ? 'Judicial' : 'Extrajudicial',
    comitente: lei.descricaoInterna ? titulo(decode(lei.descricaoInterna)) : null,
    leiloeiro: nomeSite(dom),
    leiloeiroSite: dom,
    lotes: 1,
    codigo: l.numero ? `Lote ${l.numero}` : null,
    imagem: foto,
    url,
  };
}

async function coletarSite(dom) {
  const home = await get(`https://www.${dom}/`, { delay: 200 });
  const base = new URL(home.url).origin; // alguns redirecionam para outro domínio/sem www
  const cards = new Map(); // url -> subcategoria (h3)
  for (let p = 1; p <= 30; p++) {
    const html = await (await get(`${base}/buscador?categoria=1&judicial=1&page=${p}`, { delay: 200 })).text();
    const blocos = html.split('<article class="lote-main').slice(1);
    let novos = 0;
    for (const b of blocos) {
      const href = b.match(/href="(\/eventos\/leilao\/[^"]+\/lote\/\d+\/[^"]*)"/)?.[1];
      if (!href || cards.has(base + href)) continue;
      cards.set(base + href, decode(b.match(/<h3>([^<]*)<\/h3>/)?.[1] || '').trim());
      novos++;
    }
    if (!novos || !html.includes(`page=${p + 1}`)) break;
  }

  const itens = [];
  for (const [url, sub] of cards) {
    try {
      const l = jsonLote(await (await get(url, { delay: 200 })).text());
      if (!l || !l.leilao?.judicial || l.sucata || l.arremate || l.valorArremate || l.dataFechado || l.deleted) continue;
      const lote = mapear(dom, url, sub, l);
      const tipo = tipoVeiculo(lote.tituloOriginal, sub);
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
  if (falhas.length) console.warn(`  ↳ Suporte Leilões: ${falhas.length} site(s) sem resposta: ${falhas.join(', ')}`);
  return itens;
}
