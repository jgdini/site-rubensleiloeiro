// Roda todos os coletores e grava data/lotes.json (consumido pelo site).
// Uso: node scraper/run.js [fonte1 fonte2 ...]
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as leilaovip from './sources/leilaovip.js';
import * as megaleiloes from './sources/megaleiloes.js';
import * as lancejudicial from './sources/lancejudicial.js';
import * as leiloesjudiciais from './sources/leiloesjudiciais.js';
import * as d1lance from './sources/d1lance.js';
import * as eleiloes from './sources/eleiloes.js';
import * as plataformaSpl from './sources/plataforma-spl.js';
import * as plataformaB from './sources/plataforma-b.js';
import * as zuk from './sources/zuk.js';

// Só leilões JUDICIAIS. (sources/leilo.js existe, mas é 100% extrajudicial — fora.)
const FONTES = [leiloesjudiciais, megaleiloes, lancejudicial, leilaovip, d1lance, eleiloes, plataformaSpl, plataformaB, zuk];
const soJudicial = (l) => l.natureza === 'Judicial';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saida = path.join(raiz, 'data', 'lotes.json');

const filtro = process.argv.slice(2);
const anterior = await readFile(saida, 'utf8').then(JSON.parse).catch(() => null);

const lotes = [];
const fontes = [];
for (const f of FONTES) {
  if (filtro.length && !filtro.includes(f.fonte.id)) {
    // Coleta parcial: preserva as outras fontes como estavam.
    lotes.push(...(anterior?.lotes?.filter((l) => l.fonte === f.fonte.id) || []));
    const info = anterior?.fontes?.find((x) => x.id === f.fonte.id);
    if (info) fontes.push(info);
    continue;
  }
  const t0 = Date.now();
  try {
    const itens = (await f.coletar()).filter(soJudicial);
    lotes.push(...itens);
    fontes.push({ ...f.fonte, total: itens.length, ok: true, atualizado: new Date().toISOString() });
    console.log(`✔ ${f.fonte.nome}: ${itens.length} carros (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    // Se uma fonte falhar, mantém os lotes dela da última coleta pra o site não ficar vazio.
    const velhos = anterior?.lotes?.filter((l) => l.fonte === f.fonte.id) || [];
    lotes.push(...velhos);
    const velhaInfo = anterior?.fontes?.find((x) => x.id === f.fonte.id);
    fontes.push({ ...f.fonte, total: velhos.length, ok: false, erro: e.message, atualizado: velhaInfo?.atualizado || null });
    console.error(`✖ ${f.fonte.nome}: ${e.message} — mantidos ${velhos.length} da coleta anterior`);
  }
}

// Remove já encerrados e duplicatas.
const agora = Date.now();
const unicos = [...new Map(lotes.map((l) => [l.id, l])).values()].filter(
  (l) => !l.encerra || new Date(l.encerra).getTime() > agora - 2 * 3600e3
);
unicos.sort((a, b) => (a.encerra ? new Date(a.encerra) : Infinity) - (b.encerra ? new Date(b.encerra) : Infinity));

const geradoEm = new Date().toISOString();
await mkdir(path.dirname(saida), { recursive: true });
await writeFile(saida, JSON.stringify({ geradoEm, total: unicos.length, fontes, lotes: unicos }, null, 1));

// Vitrine gratuita: mostra o preço, mas sem link e sem leiloeiro/órgão (o assinante paga pra chegar ao leilão).
// Em produção, SÓ este arquivo fica público; lotes.json deve ser servido apenas a usuários logados.
const PRIVADOS = ['url', 'processo', 'fonte', 'comitente', 'leiloeiro', 'leiloeiroSite', 'codigo', 'tituloOriginal'];
const vitrine = unicos.map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => !PRIVADOS.includes(k))));
const leiloeiros = new Set([...fontes.filter((f) => !['leiloesjudiciais', 'tjsp', 'platb'].includes(f.id)).map((f) => f.id), ...unicos.map((l) => l.leiloeiroSite).filter(Boolean)]);
await writeFile(
  path.join(path.dirname(saida), 'vitrine.json'),
  JSON.stringify({ geradoEm, total: vitrine.length, leiloeiros: leiloeiros.size, lotes: vitrine }, null, 1)
);
console.log(`\n${unicos.length} carros gravados em data/lotes.json (+ data/vitrine.json sem links)`);
