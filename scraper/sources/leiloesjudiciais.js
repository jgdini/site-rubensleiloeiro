// Leilões Judiciais (leiloesjudiciais.com.br) — portal que reúne vários leiloeiros oficiais.
// API usada pelo próprio site: POST api.leiloesjudiciais.com.br/core/api/get-lotes (categoria 4 = Carros).
// O portal mistura processos judiciais com leilões administrativos (DETRAN etc.); aqui só entram
// lotes cujo leilão/descrição indicam origem judicial.
import { get, anoDe, marcaDe, titulo, limparTitulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://www.leiloesjudiciais.com.br';
const API = 'https://api.leiloesjudiciais.com.br/core/api/get-lotes';
export const fonte = { id: 'leiloesjudiciais', nome: 'Leilões Judiciais', site: BASE };

const ADMINISTRATIVO = /DETRAN|DEPARTAMENTO ESTADUAL DE TR[AÂ]NSITO|CIRCULA[CÇ][AÃ]O|PREFEITURA|MUNIC[IÍ]PIO DE|EXTRAJUDICIAL|BANCO |SEGURADORA|CONS[OÓ]RCIO|ALIENA[CÇ][AÃ]O FIDUCI|RECEITA FEDERAL|SIMULA[CÇ][AÃ]O|TESTE/i;
const JUDICIAL = /JUSTI[CÇ]A|\bVARA\b|TRIBUNAL|\bTRT\b|\bTJ[A-Z]{2}\b|JUDICIA|PROCESSO|\bPROC\b|\bAUTOS\b|EXEQUENTE|EXECUTAD|SENAD|SECRETARIA NACIONAL DE POL[IÍ]TICAS SOBRE DROGAS|\d{7}-\d{2}\.\d{4}/i;

const semHtml = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
const num = (s) => (s == null || s === '' ? null : +s);

function ehJudicial(l) {
  if (ADMINISTRATIVO.test(l.nm_titulo_leilao || '')) return false;
  return JUDICIAL.test(`${l.nm_titulo_leilao} ${l.nm_titulo_lote} ${semHtml(l.nm_descricao)}`);
}

function mapear(l) {
  // "I/BMW X5 M50D - 18/19 - Preta - Depósito"
  const partes = (l.nm_titulo_lote || '').split(/\s+-\s+/);
  const modelo = partes[0].replace(/^(I|IMP)\s*\//i, '').replace(/\s*\/\s*/, ' ');
  const anoTxt = partes.find((p) => /^\d{2,4}\s*\/\s*\d{2,4}$/.test(p.trim()));
  const ano = anoTxt ? anoDe('ano ' + anoTxt) : anoDe(l.nm_titulo_lote + ' ' + semHtml(l.nm_descricao).slice(0, 400));
  const foto = l.fotos?.[0];
  const dt = l.dt_fechamento ? l.dt_fechamento.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00') : null;

  return {
    id: `leiloesjudiciais-${l.lote_id}`,
    fonte: fonte.id,
    titulo: limparTitulo(modelo),
    tituloOriginal: l.nm_titulo_lote,
    marca: marcaDe(partes[0]),
    ano,
    km: null,
    cidade: l.nm_cidade ? titulo(l.nm_cidade) : null,
    uf: l.nm_estado || null,
    lance: num(l.vl_lance) ?? num(l.vl_lanceinicial),
    lanceInicial: num(l.vl_lanceinicial),
    lances: l.nu_qtdelances || 0,
    valorMercado: null,
    encerra: dt,
    status: l.nm_statuslote || null,
    natureza: 'Judicial',
    // Só mostra o "comitente" quando o título do leilão é o órgão (Justiça X - Vara Y).
    comitente: /JUSTI[CÇ]A|VARA|TRIBUNAL|\bTRT\b|SENAD|SECRETARIA NACIONAL/i.test(l.nm_titulo_leilao || '')
      ? titulo(l.nm_titulo_leilao.replace(/^(LEIL[AÃ]O D[AOE]S?\s+|ALIENA[CÇ][AÃ]O\s+(ANTECIPADA|DEFINITIVA)?\s*D[AOE]S?\s+|UNIFICADO\s+)/i, '').trim()).slice(0, 70)
      : null,
    leiloeiro: l.nm_leiloeiro || null,
    leiloeiroSite: l.nm_url_leiloeiro ? l.nm_url_leiloeiro.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null,
    lotes: 1,
    codigo: `#${l.lote_id}`,
    imagem: foto ? `${foto.nm_path_incompleto}640x480/${foto.nm_path}` : null,
    url: `${BASE}/lote/${l.leilao_id}/${l.lote_id}`,
  };
}

export async function coletar({ porPagina = 100, maxPaginas = 30 } = {}) {
  const itens = [];
  for (let pg = 1; pg <= maxPaginas; pg++) {
    const qs = new URLSearchParams({
      pg, qtd_por_pagina: porPagina, tipo: 1, estado: 0, cidade: 0, valor_min: 0, valor_max: 0, palavra_chave: '',
      leilao_id: 0, lote_id: 0, ordenacao: 'max', ehvitrinesaladisputa: false, faixa_desconto: 0, com_foto: 0, categoria: 4,
    });
    const res = await get(`${API}?${qs}`, { method: 'POST', headers: { Origin: BASE, Referer: BASE + '/' } });
    const j = await res.json();
    for (const l of j.items || []) {
      if (!/aberto|aguardando/i.test(l.nm_statuslote || '')) continue;
      if (!ehJudicial(l)) continue;
      if (!ehCarro(l.nm_titulo_lote, { categoriaCarro: true })) continue;
      itens.push(mapear(l));
    }
    if (!j.items?.length || pg >= (j.totalPages || 1)) break;
  }
  return itens;
}
