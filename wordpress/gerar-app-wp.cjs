// Gera o app.js do tema WordPress a partir do app.js do protótipo estático.
// Troca: config vinda do WP (window.VJ), login real (REST), dados via REST e checkout.
// Uso: node wordpress/gerar-app-wp.cjs
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..');
let t = fs.readFileSync(path.join(raiz, 'assets/app.js'), 'utf8');

function trocar(de, para) {
  if (typeof de === 'string' ? !t.includes(de) : !de.test(t)) throw new Error('não achei: ' + String(de).slice(0, 80));
  t = t.replace(de, para);
}

// 1) Configuração do negócio vem do WordPress (Configurações → Veículo Judicial).
trocar(/\/\/ =+ Configuração do negócio =+\nconst CONFIG = \{[\s\S]*?\n\};\n/, `// ============ Configuração do negócio (vem do WordPress: Configurações → Veículo Judicial) ============
const VJ = window.VJ || {};
const CONFIG = {
  marca: VJ.marca || 'Veículo Judicial',
  whatsapp: VJ.whatsapp || '5511947581678',
  nomeContato: VJ.nomeContato || 'Rubens',
  precoPlano: VJ.precoPlano || 'R$ 49,90/mês',
  checkoutUrl: VJ.checkoutUrl || '',
  custos: Object.assign({ consultoria: 2700, comissaoPct: 5, oficialJustica: 115, cartaArrematacao: 80, transferencia: 600 }, VJ.custos || {}),
};
`);

// 2) Sem usuários de teste: a sessão é a do WordPress.
trocar(/\/\/ Protótipo: login simulado[\s\S]*?const USUARIOS_TESTE = [^\n]*\n/, '');
trocar(/\/\/ ---------- Sessão ----------\nfunction lerSessao\(\) \{[\s\S]*?\nconst premium = \(\) => !!sessao;/,
`// ---------- Sessão (WordPress) ----------
function lerSessao() {
  return VJ.logado ? { nome: VJ.usuario || '', assinante: !!VJ.assinante } : null;
}
const premium = () => !!(sessao && sessao.assinante);`);

// 2b) Login: link "primeiro acesso / esqueci a senha" (página padrão do WordPress, que manda o link por e-mail).
trocar(`  $('#form-login').reset();\n  $('#modal-login').showModal();`,
`  $('#form-login').reset();
  if (VJ.esqueciUrl) { $('#link-esqueci').href = VJ.esqueciUrl; $('#esqueci').hidden = false; }
  $('#modal-login').showModal();`);

// 3) Nome da marca nas mensagens.
t = t.split('Radar de Leilões').join('${CONFIG.marca}');

// 4) Dados pela API do WordPress (base completa só para assinante logado).
trocar(`  const arquivo = premium() ? 'data/lotes.json' : 'data/vitrine.json';
  dados = await (await fetch(arquivo, { cache: 'no-cache' })).json();`,
`  const url = premium() ? VJ.lotesUrl : VJ.vitrineUrl;
  const r = await fetch(url, { credentials: 'same-origin', headers: premium() ? { 'X-WP-Nonce': VJ.nonce } : {} });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  dados = await r.json();
  dados.lotes ||= [];`);

// 5) Conta: sair pelo WordPress; logado sem assinatura ativa vê aviso + assinar.
trocar(`    conta.innerHTML = \`<span class="conta__selo">Assinante</span><span class="conta__nome">\${esc(sessao.nome.split(' ')[0])}</span><button type="button" class="link" id="sair">Sair</button>\`;
    $('#sair').onclick = async () => { sessao = null; gravarSessao(null); await trocarModo(); };
  } else {`,
`    conta.innerHTML = \`<span class="conta__selo">Assinante</span><span class="conta__nome">\${esc(sessao.nome.split(' ')[0])}</span><a class="link" href="\${esc(VJ.logoutUrl)}">Sair</a>\`;
  } else if (sessao) {
    conta.innerHTML = \`<span class="conta__nome" title="Sua assinatura não está ativa">\${esc(sessao.nome.split(' ')[0])} · sem assinatura</span><button type="button" class="btn btn--primario btn--peq" data-acao="assinar">Assinar</button><a class="link" href="\${esc(VJ.logoutUrl)}">Sair</a>\`;
  } else {`);

// 6) Botão de assinar: checkout (Hotmart/Kiwify) quando configurado; senão WhatsApp.
trocar(`  $('#btn-assinar-wpp').href = linkWhats(msg);`,
`  const btn = $('#btn-assinar-wpp');
  if (CONFIG.checkoutUrl) {
    btn.href = CONFIG.checkoutUrl;
    btn.className = 'btn btn--primario btn--cheio';
  } else btn.href = linkWhats(msg);`);
trocar("  $('#btn-assinar-wpp').innerHTML = `${ICONE_WPP}Quero assinar pelo WhatsApp`;",
  "  btn.innerHTML = CONFIG.checkoutUrl ? 'Assinar agora' : `${ICONE_WPP}Quero assinar pelo WhatsApp`;");

// 7) Login real (REST /vj/v1/login) e recarrega a página já autenticado.
trocar(/    const f = new FormData\(e\.target\);\n    const email = [\s\S]*?\n    await trocarModo\(\);\n  \}\);/,
`    const f = new FormData(e.target);
    const botao = e.target.querySelector('[type=submit]');
    botao.disabled = true;
    try {
      const r = await fetch(VJ.loginUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(f.get('email')).trim(), senha: String(f.get('senha')) }),
      });
      if (!r.ok) throw new Error();
      location.reload();
    } catch {
      $('#login-erro').hidden = false;
      botao.disabled = false;
    }
  });`);

if (/USUARIOS_TESTE|gravarSessao\(|localStorage/.test(t)) throw new Error('sobrou referência ao login simulado');
fs.writeFileSync(path.join(raiz, 'wordpress/theme/veiculo-judicial/assets/app.js'), '// Gerado por wordpress/gerar-app-wp.cjs a partir de assets/app.js — não edite à mão.\n' + t);
console.log('ok: tema/assets/app.js gerado');
