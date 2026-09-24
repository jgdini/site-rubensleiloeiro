# Radar de Leilões — agregador de carros de leilão judicial

Espelha os anúncios de **carros em leilões JUDICIAIS** de vários leiloeiros num site único e filtrável.
Lotes extrajudiciais (financeiras, bancos, DETRAN, seguradoras) são descartados.
Ao clicar num anúncio, o visitante vai para a página oficial do lote no leiloeiro.

## Como funciona

```
scraper/ (Node, sem dependências)  ──►  data/lotes.json  ──►  index.html + assets/ (site estático)
```

- `scraper/sources/*.js`: um coletor por leiloeiro, e todos devolvem o mesmo formato de lote.
- `scraper/classify.js`: filtro "só carros" (tira motos, caminhões, ônibus, sucata, carcaça, trailer…).
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

**Custo total** = lance + 5% comissão do leiloeiro + R$ 115 oficial de justiça + R$ 80 carta de arrematação
+ ~R$ 600 transferência + R$ 2.700 consultoria (1ª). Valores em `CONFIG.custos`.

Sucatas inservíveis (só podem ir pra reciclagem) são descartadas na coleta.

Configuração no topo de `assets/app.js`: `CONFIG.whatsapp` (+55 11 94758-1678), `CONFIG.precoPlano` (placeholder R$ 49,90/mês), `CONFIG.custos`.
Login de teste: `assinante@teste.com` / `leilao2026`.

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
