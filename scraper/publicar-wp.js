// Envia data/lotes.json e data/vitrine.json para o WordPress (plugin "Veículo Judicial – Núcleo").
// Uso: VJ_URL=https://veiculojudicial.com.br VJ_TOKEN=<chave> node scraper/publicar-wp.js
// A chave aparece em Configurações → Veículo Judicial, no painel do WordPress.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { VJ_URL, VJ_TOKEN } = process.env;
if (!VJ_URL || !VJ_TOKEN) {
  console.log('VJ_URL/VJ_TOKEN não definidos: publicação no WordPress ignorada.');
} else {
  await publicar();
}

async function publicar() {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const [lotes, vitrine] = await Promise.all(
    ['lotes', 'vitrine'].map(async (n) => JSON.parse(await readFile(path.join(raiz, 'data', `${n}.json`), 'utf8')))
  );

  // Funciona com permalinks bonitos ou simples (?rest_route=).
  const alvo = `${VJ_URL.replace(/\/$/, '')}/?rest_route=/vj/v1/importar`;
  const res = await fetch(alvo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VJ-Token': VJ_TOKEN, 'User-Agent': 'veiculo-judicial-coleta' },
    body: JSON.stringify({ lotes, vitrine }),
    signal: AbortSignal.timeout(120000),
  });
  const txt = await res.text();
  if (!res.ok) {
    console.error(`✖ WordPress respondeu ${res.status}: ${txt.slice(0, 300)}`);
    process.exitCode = 1; // sem process.exit(): no Windows ele derruba o processo antes de imprimir
    return;
  }
  console.log(`✔ Publicado no WordPress: ${txt}`);
}
