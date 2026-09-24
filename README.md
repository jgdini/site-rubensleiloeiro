# Radar de Leilões — agregador de carros em leilão

Espelha os anúncios de **carros** de vários leiloeiros num site único e filtrável.
Ao clicar num anúncio, o visitante vai para a página oficial do lote no leiloeiro.

## Como funciona

```
scraper/ (Node, sem dependências)  ──►  data/lotes.json  ──►  index.html + assets/ (site estático)
```

- `scraper/sources/*.js`: um coletor por leiloeiro, e todos devolvem o mesmo formato de lote.
- `scraper/classify.js`: filtro "só carros" (tira motos, caminhões, ônibus, sucata, carcaça, trailer…).
- `scraper/run.js`: roda tudo, remove encerrados/duplicados e grava `data/lotes.json`.
  Se uma fonte falhar, mantém os lotes dela da coleta anterior.
- `.github/workflows/atualizar.yml`: roda a coleta **a cada 3h** no GitHub Actions e commita o JSON.
  Com o GitHub Pages ligado, o site se atualiza sozinho.

### Fontes atuais

| Leiloeiro | Como coleta | Observação |
|---|---|---|
| Leilo | API JSON do próprio site (`api.leilo.com.br/v1/lote/busca-elastic`), tipo = Carros | dados ricos: km, ano, valor de mercado, lance atual |
| Mega Leilões | HTML de `/veiculos/carros?pagina=N` | 1ª/2ª praça, desconto |
| Leilão VIP | POST `/agenda?handler=pesquisarEventos` com segmento Veículos | mistura motos/caminhões, e o `classify.js` filtra |

Avaliados e **deixados de fora** por bloquearem acesso automatizado (403/Cloudflare): Sodré Santoro, Superbid, MGL, Milan.
Candidatos para as próximas fontes: Freitas Leiloeiro, Palácio dos Leilões, Parque dos Leilões, Lance no Leilão.

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
- Os coletores fazem poucas requisições espaçadas (~1 por segundo) e só a cada 3h.
- Se algum leiloeiro pedir remoção, basta tirar a fonte de `FONTES`.
- O ideal, a médio prazo, é formalizar parceria/afiliação com os leiloeiros (muitos pagam por lead).
