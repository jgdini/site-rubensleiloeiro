// Leilo — API pública usada pelo próprio site (api.leilo.com.br/v1/lote/busca-elastic),
// já filtrada por tipo "Carros". Retorna JSON rico (km, ano, valor de mercado, lance).
import { get, slug, titulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://leilo.com.br';
const API = 'https://api.leilo.com.br/v1/lote/busca-elastic';
export const fonte = { id: 'leilo', nome: 'Leilo', site: BASE };

const MARCAS_FIX = { 'VW - VOLKSWAGEN': 'Volkswagen', 'GM - CHEVROLET': 'Chevrolet', 'CAOA CHERY': 'Chery' };

function link(l) {
  const loc = slug(`${l.localizacao?.cidade || ''}-${l.localizacao?.estado || ''}`);
  const ano = l.veiculo?.anoModelo ? `/ano.${l.veiculo.anoModelo}` : '';
  return `${BASE}/leilao/${loc}/carros/${slug(l.leilao?.nome || 'leilao')}/${slug(l.nome)}${ano}/${l.id}`;
}

function mapear(l) {
  const v = l.veiculo || {};
  const marcaRaw = (v.infocarMarca || l.nome.split('/')[0] || '').toUpperCase();
  const modelo = v.infocarModelo || l.nome.split('/').slice(1).join(' ');
  const marca = MARCAS_FIX[marcaRaw] || titulo(marcaRaw);
  const lanceAtual = l.valor?.lance?.valor;
  return {
    id: `leilo-${l.id}`,
    fonte: fonte.id,
    titulo: `${marca} ${titulo(modelo)}`.trim(),
    tituloOriginal: l.nome,
    marca,
    ano: v.anoModelo || null,
    km: v.km ?? null,
    cidade: l.localizacao?.cidade ? titulo(l.localizacao.cidade) : null,
    uf: l.localizacao?.estado || null,
    lance: lanceAtual ?? l.valor?.minimo ?? null,
    lanceInicial: l.valor?.minimo ?? null,
    lances: l.valor?.lance?.quantidade || 0,
    valorMercado: v.valorMercado || null,
    encerra: l.dataFim || l.leilao?.data || null,
    status: lanceAtual ? 'Com lances' : 'Aberto para lances',
    natureza: v.retomada || 'Extrajudicial',
    comitente: l.comitente?.nome || null,
    laudo: l.laudoCautelarResultado && l.laudoCautelarResultado !== 'AUSENTE' ? l.laudoCautelarResultado : null,
    financiavel: !!l.permiteFinanciamento,
    lotes: 1,
    codigo: l.numero ? `Lote ${l.numero}` : null,
    imagem: l.fotosUrls?.[0] || null,
    url: link(l),
  };
}

export async function coletar({ tamanho = 100, max = 2000 } = {}) {
  const itens = [];
  for (let from = 0; from < max; from += tamanho) {
    const res = await get(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE, Referer: BASE + '/' },
      body: JSON.stringify({
        from,
        size: tamanho,
        requisicoesBusca: [
          { campo: 'tipo', tipo: 'exata', label: 'Tipo', valor: 'Carros', range: { min: 0, max: 0 }, itensSelecionadosMultiplaEscolha: [], itensSelecionadosMarca: [] },
        ],
        listaOrdenacao: [{ campo: 'dataFim', tipoCampo: 'long', tipoOrdenacao: 'asc' }],
      }),
    });
    const lote = await res.json();
    if (!Array.isArray(lote) || !lote.length) break;
    for (const l of lote) {
      if (l.tipo !== 'Carros') continue;
      if (!ehCarro(l.nome, { categoriaCarro: true })) continue;
      itens.push(mapear(l));
    }
    if (lote.length < tamanho) break;
  }
  return itens;
}
