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
const iso = (d) => (d?.date ? d.date.slice(0, 19).replace(' ', 'T') + (d.timezone === 'UTC' ? 'Z' : '-03:00') : null);

/** Extrai um `var {nome} = {…};` da página (fica numa linha só). */
function jsonVar(html, nome) {
  const linha = html.split('\n').find((l) => l.trimStart().startsWith(`var ${nome} = {`));
  if (!linha) return null;
  try { return JSON.parse(linha.trim().slice(`var ${nome} = `.length).replace(/;\s*$/, '')); } catch { return null; }
}

/** Lote no formato novo; o layout antigo (/oferta/…) traz `lote` e `leilao` separados e é convertido. */
function jsonLote(html) {
  const l = jsonVar(html, 'lote');
  if (!l || l.leilao) return l;
  const le = jsonVar(html, 'leilao') || {};
  const datas = [le.dataProximoLeilao, le.dataLimitePropostas].filter((d) => d?.date).sort((a, b) => a.date.localeCompare(b.date));
  const foto = html.match(/https:\/\/static\.suporteleiloes\.com\.br\/[^"' ]+\/bens\/[^"' ]+\.(?:jpe?g|png|webp)/i)?.[0] || null;
  return {
    id: +l.id,
    status: +l.status,
    numero: +l.numero || null,
    descricao: l.titulo,
    valorInicial: +l.valorInicial || null,
    valorInicial2: +l.valorInicial2 || null,
    valorAvaliacao: +l.valorAvaliacao || null,
    valorLanceAtual: +l.totalLances > 0 ? +l.valorAtual : null,
    taxasCalculadas: l.taxas || [],
    stats: { lances: +l.totalLances || 0, lote: { bem: { siteTitulo: l.titulo, image: foto ? { full: { url: foto } } : null } } },
    leilao: {
      judicial: le.judicial === true || le.judicial === 'true',
      data1: datas.at(-1) || null,
      data2: null,
      descricaoInterna: le.titulo,
      leiloeiro: { uf: le.leiloeiroUf },
    },
  };
}

function mapear(dom, url, sub, l) {
  const lei = l.leilao || {};
  const bem = l.stats?.lote?.bem || {};
  let nome = decode(bem.siteTitulo || l.descricao || '');
  // "VW/GOL 1.6 Power 2009-2010 - Aparecida/SP": a cidade vai pro campo próprio.
  const local = nome.match(/\s+(?:-|em)\s+([A-Za-zÀ-ú' .]{3,40}?)\s*[\/-]\s*([A-Z]{2})\s*$/);
  // 'Gol 1.0, 05/05' -> ano 2005
  const yy = nome.match(/(?:^|[\s,])\d{2}\/(\d{2})(?=\s|,|$)/)?.[1];
  const anoCurto = yy ? (2000 + +yy > new Date().getFullYear() + 1 ? 1900 + +yy : 2000 + +yy) : null;
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
    titulo: limparTitulo(nome.replace(/,?\s*\d{2}\/\d{2}\s*$/, '').replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ')).replace(/^[-–\s]+/, ''),
    tituloOriginal: [sub, nome].filter(Boolean).join(' — '),
    marca: marcaDe(nome.replace(/\//g, ' ')),
    ano: anoDe(nome) || anoCurto,
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
    fimPraca1: v2 && e2 ? e1 : null,
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
  let temBuscador = true;
  try { await get(`${base}/buscador?categoria=1&judicial=1&page=1`, { delay: 200 }); } catch { temBuscador = false; }
  // Layout antigo da plataforma: /busca?page=N com links /oferta/{modalidade}/veiculos/{sub}/…
  for (let p = 1; !temBuscador && p <= 40; p++) {
    const html = await (await get(`${base}/busca?page=${p}`, { delay: 200 })).text();
    const links = [...html.matchAll(/href="(\/oferta\/[^/"]+\/veiculos\/([^/"]+)\/[^"]+)"/g)];
    for (const [, href, sub] of links) if (!cards.has(base + href)) cards.set(base + href, titulo(sub.replace(/-/g, ' ')));
    if (!html.includes('href="/oferta/') || !html.includes(`page=${p + 1}`)) break;
  }
  for (let p = 1; temBuscador && p <= 30; p++) {
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
      if (lote.encerra && new Date(lote.encerra) < Date.now()) continue;
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
