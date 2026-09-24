// Roda todos os coletores e grava data/lotes.json (consumido pelo site).
// Uso: node scraper/run.js [fonte1 fonte2 ...]
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as leilaovip from './sources/leilaovip.js';
import * as megaleiloes from './sources/megaleiloes.js';
import * as leilo from './sources/leilo.js';

const FONTES = [leilo, megaleiloes, leilaovip];
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
    const itens = await f.coletar();
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

await mkdir(path.dirname(saida), { recursive: true });
await writeFile(saida, JSON.stringify({ geradoEm: new Date().toISOString(), total: unicos.length, fontes, lotes: unicos }, null, 1));
console.log(`\n${unicos.length} carros gravados em data/lotes.json`);
