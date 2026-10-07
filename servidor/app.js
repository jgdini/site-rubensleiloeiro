// Web App Node.js (Hostinger) que roda a coleta diária e publica no WordPress — substitui o GitHub Actions.
//
//   GET /                      situação da última coleta (sem dados sensíveis)
//   GET /coletar?chave=XXXX    dispara a coleta agora (chave = VJ_TOKEN); usado pela tarefa agendada do hPanel
//
// Variáveis de ambiente (configuradas no hPanel → Web App):
//   VJ_URL    = https://veiculojudicial.com.br
//   VJ_TOKEN  = chave de importação (WordPress → Configurações → Veículo Judicial)
//   HORA_COLETA (opcional) = hora em Brasília para a coleta automática, padrão 6
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arqStatus = path.join(raiz, 'data', 'status-coleta.json');
const HORA = Number(process.env.HORA_COLETA ?? 6);

let rodando = null; // Promise da coleta em andamento
let status = await readFile(arqStatus, 'utf8').then(JSON.parse).catch(() => ({}));

const agoraBR = () => new Date(Date.now() - 3 * 3600e3); // Brasília (UTC-3, sem horário de verão)
const diaBR = () => agoraBR().toISOString().slice(0, 10);

function rodar(script, env = {}) {
  return new Promise((ok) => {
    const p = spawn(process.execPath, [path.join(raiz, 'scraper', script)], { cwd: raiz, env: { ...process.env, ...env } });
    let saida = '';
    p.stdout.on('data', (d) => (saida += d));
    p.stderr.on('data', (d) => (saida += d));
    p.on('close', (codigo) => ok({ codigo, saida }));
  });
}

async function coletar(origem) {
  if (rodando) return rodando;
  rodando = (async () => {
    const inicio = new Date().toISOString();
    status = { ...status, rodando: true, inicio, origem };
    const c = await rodar('run.js');
    const linhas = c.saida.split('\n').filter((l) => /✔|✖|↳|gravados/.test(l)).map((l) => l.slice(0, 200));
    let publicado = 'não publicado (coleta falhou)';
    if (c.codigo === 0) {
      const p = await rodar('publicar-wp.js');
      publicado = p.saida.trim().split('\n').pop().slice(0, 300);
    }
    status = { rodando: false, origem, inicio, fim: new Date().toISOString(), ok: c.codigo === 0, dia: diaBR(), resumo: linhas, publicado };
    await mkdir(path.dirname(arqStatus), { recursive: true });
    await writeFile(arqStatus, JSON.stringify(status, null, 1));
    console.log(`[coleta ${origem}] ${status.ok ? 'ok' : 'FALHOU'} — ${publicado}`);
  })().finally(() => (rodando = null));
  return rodando;
}

// Relógio interno: a cada minuto confere se já é hora e se a coleta de hoje ainda não rodou.
setInterval(() => {
  if (rodando) return;
  const h = agoraBR().getUTCHours();
  if (h >= HORA && status.dia !== diaBR() && !(status.rodando)) coletar('relógio');
}, 60e3);

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const json = (codigo, obj) => {
      res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(obj, null, 1));
    };
    if (url.pathname === '/coletar') {
      if (!process.env.VJ_TOKEN || url.searchParams.get('chave') !== process.env.VJ_TOKEN) return json(403, { ok: false, erro: 'chave inválida' });
      if (rodando) return json(202, { ok: true, msg: 'coleta já em andamento' });
      coletar(url.searchParams.get('origem') || 'manual');
      return json(202, { ok: true, msg: 'coleta iniciada; acompanhe em /' });
    }
    if (url.pathname === '/') {
      return json(200, { servico: 'coleta Veículo Judicial', configurado: !!(process.env.VJ_URL && process.env.VJ_TOKEN), rodando: !!rodando, horaColeta: `${HORA}h (Brasília)`, ultima: status });
    }
    json(404, { erro: 'não encontrado' });
  })
  .listen(process.env.PORT || 3000, () => console.log(`coleta pronta na porta ${process.env.PORT || 3000}`));
