// Leiloeiros da lista TJSP que usam a "Sua Plataforma de Leilão" (suaplataformadeleilao.com.br).
// Todos expõem a mesma API do próprio site:
//   GET  /busca/                         -> cookie + __RequestVerificationToken + id da categoria "Carros"
//   POST /ApiEngine/GetBusca/1/{N}/0     -> N funciona como "rolagem": devolve os N×8 primeiros lotes
// Cada lote traz modalidade (Judicial/Extrajudicial), comissão do leiloeiro, avaliação, praças e fotos.
import { get, sleep, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { tipoVeiculo } from '../classify.js';

export const fonte = { id: 'tjsp', nome: 'Credenciados TJSP', site: 'https://www.tjsp.jus.br/auxiliaresjustica/auxiliarjustica/gestoresjudiciais' };

// Sites da lista do Rubens (pasta Arquivos/LEILAO TJSP) que rodam nesta plataforma.
export const SITES = [
  '123leiloes.com.br', 'actleiloes.com.br', 'agleiloes.com.br', 'agsleiloes.com.br', 'alienajud.com.br', 'atrioleiloes.com.br',
  'casareisleiloes.com.br', 'crisleiloes.com.br', 'destakleiloes.com.br', 'francoleiloes.com.br', 'franklinleiloes.com.br',
  'gfleiloes.com.br', 'impactoleiloes.com.br', 'insigneleiloes.com.br', 'legisleiloes.com.br', 'leilaooficialonline.com.br',
  'leiloesmager.com.br', 'multipliqueleiloes.com.br', 'nacionalleiloes.com.br', 'peixotoleiloes.com.br', 'portalbayit.com.br',
  'projudleiloes.com.br', 'selectleiloes.com.br', 'sublimeleiloes.com.br', 'teza.com.br', 'trustbid.com.br',
  'vendasjudiciais.com.br', 'vivaleiloes.com.br',
];

const nomeSite = (d) => titulo(d.replace(/\.com\.br$|\.com$|\.lel\.br$/, '').replace(/leiloes$|leilao$|leiloeira$|leiloeiro$/, ' Leilões').replace(/-/g, ' ')).trim();
const iso = (s) => (s && !s.startsWith('0001') && !s.startsWith('1900') ? s.slice(0, 19) + '-03:00' : null);

async function sessao(base) {
  const res = await get(`${base}/busca/`, { delay: 300 });
  const html = await res.text();
  return {
    cookie: (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; '),
    token: html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1] || '',
    catCarros: 0, // 0 = todas as categorias; filtramos pela categoria-mãe "Veículos" de cada lote
  };
}

function mapear(dom, base, l) {
  const rt = l.GetLoteRealTime?.[0] || {};
  // Alguns leiloeiros põem no "Lote" só o ano, o número ou a vara; aí o nome útil está no "Leilao".
  const util = (s) => /[a-z]{3}/i.test(s || '') && !/^(fabrica|modelo)|\bvara\b|^\d+$/i.test(s);
  const nomeLote = util(l.Lote) ? l.Lote : util(l.Leilao) ? l.Leilao : l.Lote || l.Leilao || '';
  const temLance = rt.ValorLanceAtual > 0;
  const lance = temLance ? rt.ValorLanceAtual : rt.ProximoLance || null;
  const avaliacao = rt.ValorAvaliacao || l.ValorAvaliacao || null;
  const foto = l.Fotos?.[0]?.Foto;
  const processo = l.CFGForms?.find((c) => /processo/i.test(c.Label))?.Value;
  const lote = {
    id: `tjsp-${dom}-${l.ID_Leiloes_Lote}`,
    fonte: fonte.id,
    titulo: limparTitulo(
      nomeLote
        .replace(/^(carros?|ve[ií]culo|um ve[ií]culo)\s*[-:,]?\s*/i, '')
        .replace(/^[A-ZÀ-Ú ]+-\s*(?=UM VE[IÍ]CULO)/, '')
        .replace(/^um ve[ií]culo,?\s*/i, '')
        .replace(/\s*[-|,]\s*(cor|ano|fab|placa|chassi|renavam)\b.*$/i, '')
        .replace(/\s*-\s*[A-ZÀ-Ú][\wÀ-ú ]+-\s*[A-Z]{2}\s*$/, '')
    ),
    tituloOriginal: l.Lote,
    marca: marcaDe(nomeLote.replace(/\//g, ' ')),
    ano: anoDe(nomeLote),
    km: null,
    cidade: l.Cidade ? titulo(l.Cidade) : null,
    uf: l.UF || null,
    lance,
    lanceInicial: rt.ValorMinimoLancePrimeiraPraca || null,
    segundaPraca: rt.QtdPracas > 1 && rt.ValorMinimoLanceSegundaPraca > 0 ? rt.ValorMinimoLanceSegundaPraca : null,
    lances: l.Lances || 0,
    valorMercado: null,
    desconto: avaliacao && lance && lance < avaliacao ? Math.round((1 - lance / avaliacao) * 100) : null,
    comissao: l.Comissao ?? rt.Comissao ?? null,
    encerra: iso(rt.DataTermino) || iso(rt.DataHoraEncerramentoSegundaPraca) || iso(rt.DataHoraEncerramentoPrimeiraPraca),
    status: rt.Lote_SubStatus_Label || null,
    natureza: /extra/i.test(l.LabelModalidade) ? 'Extrajudicial' : /judicial/i.test(l.LabelModalidade) ? 'Judicial' : l.LabelModalidade,
    comitente: [l.Comitente && titulo(l.Comitente.replace(/\s+TJSP$/i, '')), l.Vara].filter(Boolean).join(' · ') || null,
    processo: processo || null,
    leiloeiro: nomeSite(dom),
    leiloeiroSite: dom,
    lotes: 1,
    codigo: l.LoteNumero ? `Lote ${l.LoteNumero}` : null,
    imagem: foto ? `${base}/imagens-center/770x620/${foto}` : null,
    url: `${base}/${l.URLlote}`,
  };
  if (!/[a-z]{2}/i.test(lote.titulo)) lote.titulo = 'Veículo (detalhes no edital)';
  return lote;
}

async function coletarSite(dom) {
  const base = `https://www.${dom}`;
  const s = await sessao(base);
  const body = {
    RangeValores: 0, Scopo: 0, IgnoreScopo: 0, OrientacaoBusca: 0, Mapa: '', Busca: '', ID_Categoria: s.catCarros, ID_Estado: 0, ID_Cidade: 0,
    Bairro: '', ID_Regiao: 0, ValorMinSelecionado: 0, ValorMaxSelecionado: 0, CFGs: '', Pagina: 1, sInL: '', Ordem: 0, OrdSt: 0,
    QtdPorPagina: 100, SubStatus: [], ID_Leiloes_Status: [], PaginaIndex: 1, BuscaProcesso: '', NomesPartes: '', CodLeilao: '',
    TiposLeiloes: [], PracaAtual: 0, DataAbertura: '', DataEncerramento: '', Filtro: {},
  };
  const res = await get(`${base}/ApiEngine/GetBusca/1/200/0`, {
    method: 'POST',
    delay: 300,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Requested-With': 'XMLHttpRequest', __RVT: s.token, Cookie: s.cookie, Referer: `${base}/busca/` },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  return (j.Lotes || [])
    .filter((l) => /ve[ií]culo/i.test(l.Categoria || ''))
    .filter((l) => /aberto|aguardando|online/i.test(l.GetLoteRealTime?.[0]?.Lote_SubStatus_Label || ''))
    .map((l) => ({ ...mapear(dom, base, l), tipo: tipoVeiculo(`${l.Lote || ''} ${l.Leilao || ''}`, l.IconeCategoria || '') }))
    .filter((l) => l.tipo);
}

export async function coletar() {
  const itens = [];
  const falhas = [];
  // 4 sites em paralelo, cada um com poucas requisições espaçadas.
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
  if (falhas.length) console.warn(`  ↳ plataforma SPL: ${falhas.length} site(s) sem resposta: ${falhas.join(', ')}`);
  return itens;
}
