// Leiloeiros da lista do Rubens que usam a "plataforma B" (assets em d1mdxpzu4pgcoh.cloudfront.net).
//   GET /lotes/search?tipo=veiculo&categoria_id=N&comitente_id=X&page=P  -> lista (sem data/cidade)
//   GET /item/{id}/detalhes                                              -> datas das praças, valores, local, foto
// Só entram comitentes judiciais (Tribunal/Justiça/Vara…); pátios de DETRAN/prefeituras ficam de fora.
import { get, clean, decode, brl, dataBR, marcaDe, anoDe, titulo, limparTitulo, sleep } from '../lib.js';
import { tipoVeiculo } from '../classify.js';

export const fonte = { id: 'platb', nome: 'Leiloeiros SP', site: 'https://www.tjsp.jus.br' };

export const SITES = [
  '3torresleiloes.com.br', 'apiceleiloes.com.br', 'calilleiloes.com.br', 'cencin.com.br', 'conceitoleiloes.com.br',
  'damasioleiloes.com.br', 'danielgarcialeiloes.com.br', 'lanceja.com.br', 'lanceleiloes.com.br', 'leiloesgold.com.br',
  'ricoleiloes.com.br', 'tmleiloes.com.br', 'tribunaleiloes.com.br', 'vegasleiloes.com.br',
  // também na lista TJSP
  'lottileiloes.com.br', 'machadoleiloeiro.com.br', 'gspleiloes.com.br', 'leiloeiro.online', 'glleiloes.com.br',
  'hammer.lel.br', 'nogarileiloes.com.br', 'tenleilao.com.br', 'cardosoleiloes.com.br', 'amaralleiloes.com.br',
];

const JUDICIAL = /TRIBUNAL|JUSTI[CÇ]A|\bVARA\b|\bTRT\b|\bTJ[A-Z]{0,2}\b|JU[IÍ]ZO|FORO|JUDICI/i;
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const ESTADOS = { 'SAO PAULO': 'SP', 'SANTA CATARINA': 'SC', 'PARANA': 'PR', 'RIO GRANDE DO SUL': 'RS', 'MINAS GERAIS': 'MG', 'RIO DE JANEIRO': 'RJ', 'GOIAS': 'GO', 'BAHIA': 'BA', 'MATO GROSSO DO SUL': 'MS', 'MATO GROSSO': 'MT', 'ESPIRITO SANTO': 'ES', 'DISTRITO FEDERAL': 'DF', 'PERNAMBUCO': 'PE', 'CEARA': 'CE' };
function ufDoComitente(c = '') {
  const s = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const k = Object.keys(ESTADOS).find((e) => s.includes(e));
  return k ? ESTADOS[k] : null;
}
const NOMES = {
  'danielgarcialeiloes.com.br': 'Daniel Garcia Leilões', '3torresleiloes.com.br': '3 Torres Leilões', 'leiloesgold.com.br': 'Leilões Gold',
  'machadoleiloeiro.com.br': 'Machado Leiloeiro', 'leiloeiro.online': 'Leiloeiro Online', 'hammer.lel.br': 'Hammer Leilões',
  'tenleilao.com.br': 'Ten Leilão', 'lanceja.com.br': 'Lance Já', 'gspleiloes.com.br': 'GSP Leilões', 'glleiloes.com.br': 'GL Leilões',
  'tmleiloes.com.br': 'TM Leilões', 'apiceleiloes.com.br': 'Ápice Leilões',
};
const nomeSite = (d) => NOMES[d] || titulo(d.replace(/\.com\.br$|\.com$|\.lel\.br$|\.online$/, '').replace(/leiloes$|leilao$|leiloeiro$/, ' Leilões')).trim();

// Nome genérico ("Automóvel", "Veículo") -> usa a descrição; tira "em Cidade UF", cor, placa.
function tituloDe(nome, descricao, descLote = '') {
  const generico = !nome.trim() || /^(autom[oó]vel|ve[ií]culo|carro|caminhonete|camioneta)s?$/i.test(nome.trim());
  // "01 (um) automóvel, Fiat Palio El, placas ..." / "um veículo marca VW, modelo Gol, ..."
  const doLote = descLote.match(/(?:autom[oó]vel|ve[ií]culo|caminhonete|camioneta)\s*,?\s*(?:marca\s*)?([^,;]{3,60}?)(?:,|;|\s+placas?\b|\s+ano\b)/i)?.[1];
  const descUtil = /^leil[aã]o\b/i.test(descricao) ? '' : descricao;
  let n = generico ? doLote || descUtil || nome : nome;
  n = n
    .replace(/^\[[^\]]*\]\s*/, '') // "[placa] Ford Focus"
    .replace(/^modelo\s*/i, '')
    .replace(/^(autom[oó]vel|ve[ií]culo)\s*[-:/]?\s*/i, '')
    .replace(/^\/?I\s*\//i, '')
    .replace(/\s+na cidade de .*$/i, '')
    .replace(/\s+em [A-Za-zÀ-ú' .-]+?[\s/-]+[A-Z]{2}\s*$/i, '')
    .replace(/\s*-\s*(cor|placa|gasolina|flex|diesel|álcool|alcool)\b.*$/i, '')
    .replace(/\s+ano\/?[\d/ ]*.*$/i, '');
  const t = limparTitulo(n);
  return /[a-z]{3}/i.test(t) && !/^(autom[oó]vel|ve[ií]culo)$/i.test(t) ? t : 'Veículo (detalhes no edital)';
}

// Rótulo -> valor seguinte, no texto "achatado" da página de detalhe.
function campo(linhas, rotulo, n = 1) {
  const i = linhas.findIndex((s) => s.toLowerCase().startsWith(rotulo.toLowerCase()));
  return i >= 0 ? linhas[i + n] : null;
}

async function detalhe(dom, url, base) {
  const html = await (await get(url, { delay: 250 })).text();
  const linhas = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => decode(s).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const judicial = linhas.some((s) => /^LEIL[AÃ]O JUDICIAL$/i.test(s));
  const iLote = linhas.findIndex((s) => /^LOTE \d+$/i.test(s));
  // Nome: a linha logo antes de "As fotos são meramente ilustrativas" (âncora estável em todos os sites).
  const iFotos = linhas.findIndex((s) => /^As fotos s[aã]o meramente ilustrativas/i.test(s));
  const NAV = /^(LOTE \d+|Voltar a Lista|Pr[oó]ximo Lote|Lote Anterior|Favorit[oa]r?|Compartilhar:?)$/i;
  let nome = '';
  for (let i = iFotos - 1; iFotos > 0 && i > iFotos - 4; i--) if (!NAV.test(linhas[i])) { nome = /^LOTE \d+$/i.test(linhas[i]) ? '' : linhas[i]; break; }
  // "Descrição:" completa (seção Detalhes do Lote) e comitente declarado.
  const descLote = campo(linhas, 'Descrição:') || '';
  const comitenteDecl = campo(linhas, 'Comitente:');
  // Bloco do leiloeiro: [LEILOEIRO OFICIAL, nome, matrícula, comitente?, descrição?, LEILÃO JUDICIAL]
  const iLeil = linhas.findIndex((s) => /^LEILOEIRO OFICIAL$/i.test(s));
  const iJud = linhas.findIndex((s) => /^LEIL[AÃ]O (JUDICIAL|EXTRAJUDICIAL)$/i.test(s));
  const extras = iLeil >= 0 && iJud > iLeil ? linhas.slice(iLeil + 3, iJud) : [];
  const comitente =
    (comitenteDecl && JUDICIAL.test(comitenteDecl) ? comitenteDecl.replace(/\.$/, '') : null) ||
    extras.find((s) => JUDICIAL.test(s) && s.length < 90)?.replace(/^Leil[aã]o Online d[ao]\s+/i, '') ||
    null;
  const descricao = extras.filter((s) => s !== comitente).join(' ');
  const maiorLance = linhas.findIndex((s) => /^MAIOR LANCE NO MOMENTO$/i.test(s));
  const lanceAtual = maiorLance >= 0 ? brl(linhas[maiorLance + 1]) : null;
  const d1 = campo(linhas, 'Data 1º Leilão:');
  const d2 = campo(linhas, 'Data 2º Leilão:');
  const idx1 = linhas.findIndex((s) => /^Data 1º Leilão:/i.test(s));
  const idx2 = linhas.findIndex((s) => /^Data 2º Leilão:/i.test(s));
  const v1 = idx1 >= 0 ? brl(linhas[idx1 + 3]) : null;
  const v2 = idx2 >= 0 ? brl(linhas[idx2 + 3]) : null;
  // Cidade/UF: "na cidade de X/UF" na descrição, "Local do Leilão: - X - UF" ou "... em X SP" no nome.
  // "Local do Leilão: Www.site.com.br - São Paulo - SP" -> últimas partes úteis
  const partesLocal = (campo(linhas, 'Local do Leilão:') || '')
    .split(/\s*-\s*/)
    .filter((p) => p && !/www\.|online|https?:|^av\.|^rua /i.test(p));
  const doLocal = partesLocal.length >= 2 && /^[A-Z]{2}$/.test(partesLocal.at(-1)) ? [null, partesLocal.at(-2), partesLocal.at(-1)] : null;
  const emCidade = [...descLote.matchAll(/\bem ([A-ZÀ-Ú][A-Za-zÀ-ú' ]{2,40}?)\s*[\/-]\s*([A-Z]{2})\b/g)].at(-1);
  const m =
    descricao.match(/na cidade de ([A-Za-zÀ-ú' .-]+?)\s*[\/-]\s*([A-Z]{2})\b/) ||
    doLocal ||
    nome.match(/\bem ([A-Za-zÀ-ú' .-]+?)[\s\/-]+([A-Z]{2})\s*$/i) ||
    emCidade ||
    // cidade da vara: "Comarca de Itu/SP", "Vara Federal de Itajaí/SC"
    (comitente || '').match(/\bde ([A-ZÀ-Ú][A-Za-zÀ-ú' ]{2,40}?)\s*[\/-]\s*([A-Za-z]{2})\b\.?\s*$/);
  const pct = +(linhas.find((s) => /^Comiss[aã]o\s*[:(]/i.test(s))?.match(/([\d,]+)\s*%/)?.[1]?.replace(',', '.') || 0) || null;
  const avaliacao = brl(campo(linhas, 'Valor de Avaliação:'));
  const status = linhas.find((s) => /^(Aberto para lances|Aguarde Abertura|Em Loteamento|Encerrado|Arrematado|Vendido|Suspenso|Cancelado|Sem Licitante|Retirado)/i.test(s)) || null;
  const toIso = (s) => {
    const x = s && s.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:às)?\s*(\d{2}:\d{2})/);
    return x ? dataBR(x[1], x[2]) : null;
  };
  const e1 = toIso(d1), e2 = toIso(d2);
  const agora = Date.now();
  const encerra = [e1, e2].filter(Boolean).find((d) => new Date(d) > agora) || e2 || e1;
  const foto = html.match(/og:image" content="([^"]+)"/)?.[1];
  const id = url.match(/\/item\/(\d+)/)?.[1];
  return {
    judicial,
    lote: {
      id: `platb-${dom}-${id}`,
      fonte: fonte.id,
      titulo: tituloDe(nome, descricao, descLote),
      tituloOriginal: [nome, descLote.slice(0, 160)].filter(Boolean).join(' — '),
      marca: marcaDe(nome.replace(/\//g, ' ')),
      ano: anoDe(nome),
      km: null,
      cidade: m && !/justi|tribunal|estado|comarca|foro/i.test(m[1]) ? titulo(m[1].trim()) : null,
      uf: (m && UFS.includes(m[2].toUpperCase()) ? m[2].toUpperCase() : null) || ufDoComitente(comitente || ''),
      lance: lanceAtual || (v2 && e1 && new Date(e1) < agora ? v2 : v1),
      lanceInicial: v1,
      segundaPraca: v2,
      lances: lanceAtual ? 1 : 0,
      valorMercado: null,
      desconto: avaliacao && v2 && v2 < avaliacao ? Math.round((1 - v2 / avaliacao) * 100) : null,
      comissao: pct,
      encerra,
      status,
      natureza: judicial ? 'Judicial' : 'Extrajudicial',
      comitente: comitente ? titulo(comitente) : null,
      leiloeiro: nomeSite(dom),
      leiloeiroSite: dom,
      lotes: 1,
      codigo: linhas[iLote] || null,
      imagem: foto && !/sem-imagem|logo/i.test(foto) ? foto : null,
      url: `${base}/item/${id}/detalhes`,
    },
  };
}

async function coletarSite(dom) {
  const base = `https://www.${dom}`;
  const home = await (await get(base, { delay: 200 })).text();
  const cat = home.match(/lotes\/search\?tipo=veiculo&(?:amp;)?categoria_id=(\d+)/)?.[1];
  const busca = `${base}/lotes/search?tipo=veiculo${cat ? '&categoria_id=' + cat : ''}`;
  const pag1 = await (await get(busca, { delay: 200 })).text();
  const sel = pag1.match(/<select name="comitente_id"[\s\S]*?<\/select>/)?.[0] || '';
  const comitentes = [...sel.matchAll(/<option value="(\d+)">([^<]+)/g)].map(([, id, nome]) => ({ id, nome: decode(nome) })).filter((c) => JUDICIAL.test(c.nome));
  if (!comitentes.length) return [];

  const links = new Set();
  for (const c of comitentes) {
    for (let p = 1; p <= 10; p++) {
      const html = await (await get(`${busca}&comitente_id=${c.id}&page=${p}`, { delay: 200 })).text();
      const novos = [...html.matchAll(/href="(https?:\/\/[^"]+\/item\/\d+\/detalhes)[^"]*"/g)].map((m) => m[1]).filter((u) => !links.has(u));
      novos.forEach((u) => links.add(u));
      if (!novos.length || !html.includes(`page=${p + 1}`)) break;
    }
  }

  const itens = [];
  for (const url of links) {
    try {
      const { judicial, lote } = await detalhe(dom, url, base);
      if (!judicial) continue;
      if (/encerrad|arrematad|vendid|suspens|cancelad|retirad|sem licitante/i.test(lote.status || '')) continue;
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
  if (falhas.length) console.warn(`  ↳ plataforma B: ${falhas.length} site(s) sem resposta: ${falhas.join(', ')}`);
  return itens;
}
