// Leiloeiros cadastrados pelo gestor no site (WordPress → Leiloeiros).
//   GET {VJ_URL}/?rest_route=/vj/v1/fontes -> { ativos: [{ dominio, plataforma }], pausados: [dominio] }
// Os ativos entram na lista da plataforma certa; os pausados saem de todas as listas e da coleta.
// Se o site não responder, a coleta segue só com as listas do código.
import * as plataformaSpl from './sources/plataforma-spl.js';
import * as plataformaB from './sources/plataforma-b.js';
import * as suporte from './sources/suporte-leiloes.js';
import * as leilaopro from './sources/leilaopro.js';

export const PLATAFORMAS = { spl: plataformaSpl, platb: plataformaB, suporte, leilaopro };
export const dominio = (s = '') => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];

export async function aplicarFontesDoSite() {
  const base = (process.env.VJ_URL || 'https://veiculojudicial.com.br').replace(/\/$/, '');
  let dados;
  try {
    const r = await fetch(`${base}/?rest_route=/vj/v1/fontes`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    dados = await r.json();
  } catch (e) {
    console.warn(`  ↳ lista do site indisponível (${e.message}); seguindo só com as listas do código`);
    return { pausados: new Set(), adicionados: [] };
  }
  const pausados = new Set((dados.pausados || []).map(dominio));
  const adicionados = [];
  for (const { dominio: d, plataforma } of dados.ativos || []) {
    const mod = PLATAFORMAS[plataforma];
    const dom = dominio(d);
    if (!mod || !dom || pausados.has(dom)) continue;
    if (!mod.SITES.some((s) => dominio(s) === dom)) {
      mod.SITES.push(dom);
      adicionados.push(`${dom} (${plataforma})`);
    }
  }
  for (const mod of Object.values(PLATAFORMAS)) {
    for (let i = mod.SITES.length - 1; i >= 0; i--) if (pausados.has(dominio(mod.SITES[i]))) mod.SITES.splice(i, 1);
  }
  if (adicionados.length) console.log(`  ↳ incluídos pelo gestor: ${adicionados.join(', ')}`);
  if (pausados.size) console.log(`  ↳ pausados pelo gestor: ${[...pausados].join(', ')}`);
  return { pausados, adicionados };
}

/** Resumo por site para a tela "Leiloeiros": todos os monitorados (mesmo com 0 veículos hoje) + os que vieram pelos portais. */
export function resumoSites(lotes) {
  const conta = new Map();
  for (const l of lotes) {
    const d = dominio(l.leiloeiroSite || '');
    if (!d) continue;
    const x = conta.get(d) || { dominio: d, fonte: l.fonte, veiculos: 0 };
    x.veiculos++;
    conta.set(d, x);
  }
  for (const [id, mod] of Object.entries(PLATAFORMAS)) {
    for (const s of mod.SITES) {
      const d = dominio(s);
      if (!conta.has(d)) conta.set(d, { dominio: d, fonte: mod.fonte.id, veiculos: 0 });
      conta.get(d).plataforma = id;
    }
  }
  return [...conta.values()].sort((a, b) => b.veiculos - a.veiculos || a.dominio.localeCompare(b.dominio));
}
