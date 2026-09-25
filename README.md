# Radar de Leilões — agregador de veículos de leilão judicial

Espelha os anúncios de **veículos (carros, motos, caminhões, ônibus, tratores, reboques, barcos, aeronaves) em leilões JUDICIAIS** de vários leiloeiros num site único e filtrável.
Lotes extrajudiciais (financeiras, bancos, DETRAN, seguradoras) são descartados.
Ao clicar num anúncio, o visitante vai para a página oficial do lote no leiloeiro.

## Como funciona

```
scraper/ (Node, sem dependências)  ──►  data/lotes.json  ──►  index.html + assets/ (site estático)
```

- `scraper/sources/*.js`: um coletor por leiloeiro, e todos devolvem o mesmo formato de lote.
- `scraper/classify.js`: `tipoVeiculo()` classifica o tipo (carro, moto, caminhão, ônibus, máquina, reboque, náutico, aeronave) e descarta sucata, peças, imóveis e eletrônicos.
- `scraper/run.js`: roda tudo, remove encerrados/duplicados e grava `data/lotes.json`.
  Se uma fonte falhar, mantém os lotes dela da coleta anterior.
- `.github/workflows/atualizar.yml`: roda a coleta **1x por dia (06:00 de Brasília)** no GitHub Actions e commita o JSON.
  Dá pra rodar na hora pelo botão "Run workflow" na aba Actions. O site esconde sozinho os lotes que encerram ao longo do dia.
  Com o GitHub Pages ligado, o site se atualiza sozinho.

### Fontes atuais

| Leiloeiro | Como coleta | Filtro judicial |
|---|---|---|
| Leilões Judiciais | API `api.leiloesjudiciais.com.br/core/api/get-lotes` (categoria 4 = Carros) | título/descrição com Justiça, Vara, Tribunal, processo… e sem DETRAN/banco/prefeitura |
| Mega Leilões | HTML de `/veiculos/carros?pagina=N` | etiqueta "Judicial" do card |
| Lance Judicial (Grupo Lance) | HTML de `grupolance.com.br/veiculos/carros?pagina=N` | etiqueta "Judicial" do card |
| Leilão VIP | POST `/agenda?handler=pesquisarEventos` com segmento Veículos | etiqueta "Judicial" do card; o `classify.js` tira motos/caminhões |
| D1Lance | JSON do Livewire (`wire:initial-data`) em `/navegar-pelo-mapa?tipo_filtro=veiculos` | campo `modalidade = JUDICIAL` |
| E-Leilões | API `/api/categorias/automoveis?judicial=1` (plataforma Suporte Leilões) | filtro `judicial=1` da própria API |
| Credenciados TJSP (plataforma "Sua Plataforma de Leilão") | `GET /busca/` (token) + `POST /ApiEngine/GetBusca/1/60/0`, em 28 sites da lista do Rubens | campo `LabelModalidade` = Judicial; traz a **comissão do edital** (usada no custo total) |
| Leiloeiros SP (plataforma B) | `/lotes/search?tipo=veiculo&comitente_id=X` + `/item/{id}/detalhes` em 24 sites | comitente judicial + "LEILÃO JUDICIAL" na página do lote |
| Portal Zuk | `/leilao-de-veiculos` + `POST /leilao-de-imoveis/mais` | comitente (Tribunal de Justiça) no alt da foto |

### Lista TJSP do Rubens (`Arquivos/LEILAO TJSP.htm.html`)

236 sites de gestores judiciais. Triagem feita em 24/09/2026:
- **Integrados:** 28 sites da "Sua Plataforma de Leilão" (`scraper/sources/plataforma-spl.js`, lista em `SITES`);
  18 deles tinham carros judiciais abertos no dia (Legis, Sublime, Leilão Oficial Online, Destak, Portal Bayit, Casa Reis…).
  Os ~10 da rede Leilões Judiciais (Rigolon, Gilson, Giordano, Planalto, Fábio…) já entram pelo portal.
- **Plataforma B** (cloudfront `d1mdxpzu4pgcoh`) — **integrada em 25/09/2026** (`scraper/sources/plataforma-b.js`, fonte
  "Leiloeiros SP"): lê os comitentes judiciais de cada site (`comitente_id` na busca `/lotes/search?tipo=veiculo`),
  lista os veículos e abre `/item/{id}/detalhes` de cada um (datas/valores das praças, comissão, vara, foto).
  24 sites; ~52 carros de 15 leiloeiros (Daniel Garcia, Leiloeiro Online, Calil, Leilões Gold, Tribuna, Ápice…).
  Lance Leilões e Rico só têm DETRAN/prefeituras, então não entram.

### Lista `Arquivos/leiloeiros sp.txt` (25/09/2026)

87 sites únicos: 18 já cobertos, 14 da plataforma B (integrados), Confiança Leilões = espelho do E-Leilões.
Pendentes: Suporte Leilões em HTML (só WebLeilões tem carros, ~11), "Gestão de Leilões" (Avelar, Granado, Hastas,
Fidalgo, Central Judicial, Vinco, Lance no Leilão), tema Valland/Hasta Pública, tema Leilão Net/Zalli/WSP, Sato Judicial.
Bloqueiam robô: Sold/Superbid, Sodré Santoro, Milan, R. Moysés, Alexandridis, Gaia, OMC, Pegoraro.
Fora do ar/sem DNS: 3R Leilões, Arremate Leilão, Projuleiloes.
**Portal Zuk** — integrado (`scraper/sources/zuk.js`): tem seção `/leilao-de-veiculos` escondida no menu de imóveis;
~63 veículos, todos judiciais (TJSP/TJSC/TJPR), ~40 carros após o filtro. "Carregar mais" = `POST /leilao-de-imoveis/mais` (token Laravel).
- **Outras plataformas ainda não integradas:** Suporte Leilões (14 sites), Bomvalor (7), Plataforma Leiloar (5), leilao.pro, leilotech.
- **Bloqueiam robô (Cloudflare/403):** Sodré Santoro, Sold, MGL, Milan, Leje e ~20 outros menores.

O portal Leilões Judiciais publica lotes de ~30 leiloeiros oficiais (Deonizia, JR, Rio Leilões, Rigolon, Fidelis…),
então o site cobre ~35 leiloeiros no total. O campo `leiloeiroSite` guarda a origem.

`scraper/sources/leilo.js` existe mas está **desligado**, porque o Leilo é 100% extrajudicial.

Avaliados e **deixados de fora** por bloquearem acesso automatizado (403/Cloudflare): Sodré Santoro, Superbid, MGL, Milan.
Avaliados em 24/09/2026 e ainda não incluídos (poucos carros ou sem marcação judicial no card):
WebLeilões (9 carros), Klöckner (0), Leilão Brasil, Hasta Pública, Fidalgo, Viva Leilões, Casa Reis, Santa Maria,
Destak, CCJ, Lance Total, Leilões PB, Bueno Leilões. Klöckner, Bueno, Leilões PB e Leilão Brasil usam a
plataforma Suporte Leilões, como o E-Leilões.

## Planos: gratuito × assinante (protótipo)

| | Gratuito | Assinante |
|---|---|---|
| Arquivo carregado | `data/vitrine.json` (com preço; sem link, leiloeiro, órgão) | `data/lotes.json` (completo) |
| Preço do carro / desconto | visível | visível |
| Custo total da operação | 🔒 | no card (ⓘ mostra a composição) + simulador de lance |
| Clique no carro | abre o plano ("Quero assinar pelo WhatsApp") | abre o anúncio original |
| Filtro por leiloeiro | escondido | liberado |
| WhatsApp do Rubens | só pra assinar | em cada card, no simulador e botão flutuante, com mensagem pronta |

**Valor exibido = 2ª praça (2º leilão)**; sem 2ª praça, o valor único ("Praça única"). Desconto = 2ª praça vs. 1ª (avaliação).

**Custo total** = valor da 2ª praça + 5% comissão do leiloeiro + R$ 115 oficial de justiça + R$ 80 carta de arrematação
+ ~R$ 600 transferência + R$ 2.700 consultoria (1ª). Valores em `CONFIG.custos`.

Sucatas inservíveis (só podem ir pra reciclagem) são descartadas na coleta.

Configuração no topo de `assets/app.js`: `CONFIG.whatsapp` (+55 11 94758-1678), `CONFIG.precoPlano` (placeholder R$ 49,90/mês), `CONFIG.custos`.
Login de teste: ver `USUARIOS_TESTE` em `assets/app.js` (não exibido no site).

⚠️ **O login atual é simulado no navegador.** Serve pra demonstrar, mas não protege nada: `data/lotes.json` continua
acessível pra quem souber o endereço. Na versão definitiva:
1. publicar só `vitrine.json`; servir `lotes.json` por uma rota que exige sessão válida (PHP/Node/WordPress);
2. cadastro/login real (ex.: WordPress + plugin de assinatura, ou backend próprio) e cobrança recorrente
   (Mercado Pago, Asaas, Stripe…).

## Rodar localmente

```bash
node scraper/run.js            # todas as fontes
node scraper/run.js leilo      # só uma (as outras ficam como estavam)
```

Depois é só servir a pasta (ex.: `serve.ps1 -Root "C:\Claude Sites\leilao-carros" -Port 5570`).

## Adicionar um leiloeiro

1. Crie `scraper/sources/<id>.js` exportando `fonte = { id, nome, site }` e `async coletar()`,
   que devolve lotes no formato abaixo.
2. Importe e inclua em `FONTES` no `scraper/run.js`.
3. (Opcional) dê uma cor em `CORES` no `assets/app.js`.

```js
{ id, fonte, titulo, tituloOriginal, marca, ano, km, cidade, uf, lance, lanceInicial,
  valorMercado, encerra /* ISO */, status, natureza, comitente, lotes, codigo, imagem, url }
```

## Cuidados

- Mostramos só o resumo do anúncio (título, 1 foto, valor, data) com link para a origem, e não copiamos
  editais nem descrições completas. As imagens são carregadas direto do servidor do leiloeiro.
- Os coletores fazem poucas requisições espaçadas (~1 por segundo) e só uma vez por dia.
- Se algum leiloeiro pedir remoção, basta tirar a fonte de `FONTES`.
- O ideal, a médio prazo, é formalizar parceria/afiliação com os leiloeiros (muitos pagam por lead).
