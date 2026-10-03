// Monta o tema e o plugin WordPress a partir do protótipo e gera os .zip instaláveis.
//   node wordpress/build.cjs
// Saída: wordpress/dist/veiculo-judicial.zip (tema) e wordpress/dist/veiculo-judicial-core.zip (plugin)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.resolve(__dirname, '..');
const tema = path.join(__dirname, 'theme', 'veiculo-judicial');
const plugin = path.join(__dirname, 'plugin', 'veiculo-judicial-core');
const dist = path.join(__dirname, 'dist');

const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
function fatia(html, inicio, fim) {
  const i = html.indexOf(inicio);
  const j = html.indexOf(fim, i);
  if (i < 0 || j < 0) throw new Error(`trecho não encontrado: ${inicio} … ${fim}`);
  return html.slice(i, j + fim.length);
}

// 1) JS do tema (config do WP, login real, dados via REST)
require('./gerar-app-wp.cjs');

// 2) Estilos e fotos
fs.mkdirSync(path.join(tema, 'assets', 'rubens'), { recursive: true });
for (const f of ['style.css', 'rubens.css', 'og-capa.jpg', 'aviso.js']) fs.copyFileSync(path.join(raiz, 'assets', f), path.join(tema, 'assets', f));
for (const f of fs.readdirSync(path.join(raiz, 'assets', 'rubens'))) {
  fs.copyFileSync(path.join(raiz, 'assets', 'rubens', f), path.join(tema, 'assets', 'rubens', f));
}

// 3) front-page.php  (hero + filtros + grade + modais do index.html)
const idx = ler('index.html');
const home =
  fatia(idx, '<section class="hero">', '</main>') + '\n\n  ' +
  fatia(idx, '<!-- WhatsApp flutuante', '</template>');
fs.writeFileSync(
  path.join(tema, 'front-page.php'),
  `<?php\n/* Home: vitrine de veículos. Gerado por wordpress/build.cjs a partir de index.html — não edite à mão. */\nif (!defined('ABSPATH')) exit;\nget_header();\n?>\n  ${home}\n<?php get_footer();\n`
);

// 4) page-rubens.php  (o <main> de rubens.html)
let rub = fatia(ler('rubens.html'), '<main>', '</main>');
rub = rub
  .replace(/src="assets\/rubens\/([^"]+)"/g, (m, f) => `src="<?php echo esc_url(vj_asset('rubens/${f}')); ?>"`)
  .replace(/href="\.\/"/g, `href="<?php echo esc_url(home_url('/')); ?>"`)
  .replace(/class="btn btn--wpp js-wpp" target=/g, `class="btn btn--wpp js-wpp" href="<?php echo esc_url($wpp); ?>" target=`)
  .replace(/https:\/\/www\.instagram\.com\/rubensleilao\//g, `<?php echo esc_url($insta); ?>`)
  .replace(/@rubensleilao/g, `<?php echo esc_html('@' . $insta_user); ?>`);
if (/assets\/rubens\/|href="\.\/"/.test(rub.replace(/<\?php[\s\S]*?\?>/g, ''))) throw new Error('sobrou caminho relativo em page-rubens.php');
fs.writeFileSync(
  path.join(tema, 'page-rubens.php'),
  `<?php\n/*\nTemplate Name: Quem é o Rubens\n*/\n/* Gerado por wordpress/build.cjs a partir de rubens.html — não edite à mão. */\nif (!defined('ABSPATH')) exit;\n$vj = vj_tema_config();\n$insta_user = ltrim((string) $vj['instagram'], '@');\n$insta = 'https://www.instagram.com/' . $insta_user . '/';\n$wpp = vj_link_whats('Olá ' . $vj['nome_contato'] . '! Vi sua página no ' . VJ_MARCA . ' e gostaria de uma consultoria para arrematar um veículo em leilão judicial.');\nget_header();\n?>\n  ${rub}\n<?php get_footer();\n`
);

// 5) .zip (tar do Windows gera zip com "/" nos caminhos, que o WordPress aceita)
fs.mkdirSync(dist, { recursive: true });
for (const [pasta, nome] of [[tema, 'veiculo-judicial.zip'], [plugin, 'veiculo-judicial-core.zip']]) {
  const destino = path.join(dist, nome);
  if (fs.existsSync(destino)) fs.unlinkSync(destino);
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-a', '-c', '-f', destino, '-C', path.dirname(pasta), path.basename(pasta)]);
  console.log('ok:', path.relative(raiz, destino), (fs.statSync(destino).size / 1024).toFixed(0) + ' KB');
}
