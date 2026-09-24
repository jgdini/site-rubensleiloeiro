// D1Lance — página /navegar-pelo-mapa?tipo_filtro=veiculos (Laravel Livewire).
// Os lotes vêm como JSON no atributo wire:initial-data do componente "listagem-de-leiloes",
// com campo modalidade (JUDICIAL/EXTRAJUDICIAL) e praças.
import { get, decode, marcaDe, anoDe, titulo, limparTitulo } from '../lib.js';
import { ehCarro } from '../classify.js';

const BASE = 'https://d1lance.com.br';
const MIDIA = 'https://midia.d1lance.com.br/public/';
export const fonte = { id: 'd1lance', nome: 'D1Lance', site: BASE };

// "2026-10-07 15:00:00.000000" (horário de Brasília) -> ISO
const iso = (s) => (s ? s.slice(0, 19).replace(' ', 'T') + '-03:00' : null);

function mapear(l) {
  // subtítulo: "Renault Sandero Dyna 16R - 2015 - Prata"; título: "Bairro - Cidade/UF"
  const [modelo] = (l.subtitulo_do_lote || '').split(/\s+-\s+(?=(19|20)\d{2}\b)/);
  const local = (l.titulo_do_lote || '').split(/\s+-\s+/).pop() || '';
  const [cidade, uf] = local.split('/');
  const agora = Date.now();
  const pracas = (l.pracas_do_lote || []).map((p) => ({ data: iso(p.termino), valor: +p.valor || null, desconto: +p.desconto }));
  const ativa = pracas.find((p) => p.data && new Date(p.data).getTime() > agora) || pracas.at(-1) || {};
  const foto = l.lote_foto_capa || l.imagem_capa_url;

  return {
    id: `d1lance-${l.lote_id}`,
    fonte: fonte.id,
    titulo: limparTitulo(modelo.replace(/^GM\s*-\s*Chevrolet\b/i, 'Chevrolet').replace(/^(\w+)\s+\1\b/i, '$1')),
    tituloOriginal: l.subtitulo_do_lote,
    marca: marcaDe(modelo),
    ano: anoDe(' - ' + (l.subtitulo_do_lote || '').split(' - ').slice(1).join(' - ')),
    km: null,
    cidade: cidade ? titulo(cidade.trim()) : null,
    uf: uf?.trim().toUpperCase().slice(0, 2) || null,
    lance: ativa.valor ?? null,
    lanceInicial: pracas[0]?.valor ?? null,
    lances: l.quantidade_de_lances_lote || 0,
    valorMercado: null,
    desconto: ativa.desconto && ativa.desconto < 100 ? 100 - ativa.desconto : null,
    encerra: ativa.data || iso(l.data_termino_leilao),
    status: l.status === 'INICIADO' ? 'Aberto para lances' : 'Em breve',
    natureza: l.modalidade === 'JUDICIAL' ? 'Judicial' : 'Extrajudicial',
    comitente: null,
    lotes: 1,
    codigo: l.cod_leilao_composto || null,
    imagem: foto && /\.(jpe?g|png|webp)$/i.test(foto) ? MIDIA + foto : null,
    url: `${BASE}/lote/${encodeURIComponent(l.titulo_do_lote ? slugD1(l.titulo_do_lote) : 'lote')}/${l.lote_id}`,
  };
}

// Mesmo slug que o site usa: "Jardim São Jorge (Raposo Tavares) - São Paulo/SP" -> "jardim-sao-jorge-raposo-tavares-sao-paulosp"
function slugD1(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function coletar() {
  const html = await (await get(`${BASE}/navegar-pelo-mapa?tipo_filtro=veiculos`)).text();
  const attr = html.match(/wire:initial-data="(\{[^"]*listagem-de-leiloes[^"]*\})"/)?.[1];
  if (!attr) throw new Error('componente listagem-de-leiloes não encontrado');
  const dados = JSON.parse(decode(attr)).serverMemo.data;
  return (dados.lotes || [])
    .filter((l) => l.categoria_nome === 'Carros' && ['ABERTO_PARA_LANCES', 'ON_LINE'].includes(l.status_leilao))
    .filter((l) => ehCarro(l.subtitulo_do_lote || '', { categoriaCarro: true }))
    .map(mapear);
}
