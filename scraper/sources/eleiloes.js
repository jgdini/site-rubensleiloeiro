// E-Leilões — plataforma Suporte Leilões. API JSON do próprio site:
// GET /api/categorias/automoveis?judicial=1&limit=100&page=N
import { get, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://www.e-leiloes.com.br';
export const fonte = { id: 'eleiloes', nome: 'E-Leilões', site: BASE };

const iso = (s) => (s ? s.replace(' ', 'T') + '-03:00' : null);

function mapear(l) {
  const ev = l.evento || {};
  const [cidade, uf] = (l.localidade || '').split(/\s+-\s+/);
  // Praça vigente: data1/data2/data3 do evento, a primeira ainda no futuro.
  const datas = [ev.data1, ev.data2, ev.data3].map(iso).filter(Boolean);
  const encerra = datas.find((d) => new Date(d) > Date.now()) || datas.at(-1) || iso(ev.dataFimLances);
  const avaliacao = l.valores?.avaliacao || l.valorAvaliacao || null;
  const lance = l.valores?.lanceAtual || l.valores?.lanceMinimo || l.valorInicial || null;
  return {
    id: `eleiloes-${l.id}`,
    fonte: fonte.id,
    titulo: limparTitulo(l.titulo || ''),
    tituloOriginal: l.titulo,
    marca: marcaDe(l.titulo || ''),
    ano: anoDe(`${l.titulo} ${l.descricao || ''}`),
    km: null,
    cidade: cidade ? titulo(cidade) : null,
    uf: uf?.trim().toUpperCase() || null,
    lance,
    lanceInicial: l.valorInicial || null,
    segundaPraca: l.valorInicial2 || null,
    lances: l.totalLances || 0,
    valorMercado: null,
    desconto: avaliacao && lance && lance < avaliacao ? Math.round((1 - lance / avaliacao) * 100) : null,
    encerra,
    status: l.status?.label || null,
    natureza: ev.judicial ? 'Judicial' : 'Extrajudicial',
    comitente: l.comitente?.nome || null,
    lotes: 1,
    codigo: `Lote ${l.numero}`,
    imagem: l.imagem?.url || null,
    url: l.canonicalUrl || BASE + (l._website?.path || ''),
  };
}

export async function coletar({ limite = 100, maxPaginas = 10 } = {}) {
  const itens = [];
  for (let page = 1; page <= maxPaginas; page++) {
    const j = await (await get(`${BASE}/api/categorias/automoveis?judicial=1&limit=${limite}&page=${page}`)).json();
    const r = j.results?.result || [];
    for (const l of r) {
      if (!/aberto|breve|aguard/i.test(l.status?.label || '')) continue;
      if (!ehCarro(`${l.titulo} ${l.subcategoria?.nome || ''}`, { categoriaCarro: true })) continue;
      itens.push(mapear(l));
    }
    if (page * limite >= (j.results?.total || 0)) break;
  }
  return itens;
}
