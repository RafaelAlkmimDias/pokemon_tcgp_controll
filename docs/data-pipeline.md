# Pipeline de dados — fontes, scripts e como atualizar

Referência de operação: de onde vem cada pedaço de dado do app e o comando exato pra
atualizá-lo. Para o levantamento inicial de fontes candidatas (antes de decidir), veja
`docs/pokemon-tcgp-data-sources.md`. Para o modelo de dados (schema), veja o
`prisma/schema.prisma` e a seção "Modelo de dados" do `README.md`.

Nenhum dos scripts abaixo toca em dado gerado pelo usuário (`Print.ownedQuantity`) —
todos são seguros de rodar quantas vezes quiser.

---

## 1. Cartas, pacotes e coleções

**Fonte:** [`flibustier/pokemon-tcg-pocket-database`](https://github.com/flibustier/pokemon-tcg-pocket-database)
(MIT, ~94 estrelas, atualizado com frequência a cada lançamento de coleção nova).

**Arquivos consumidos** (via `raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/`):
- `sets.json` — coleções agrupadas por série (`A`, `B`), com `code`, `releaseDate`, `count`,
  `name` (multilíngue) e `packs` (nomes dos pacotes da coleção).
- `cards.json` — uma linha por carta: `set`, `number`, `rarity`, `name`, `image`, `packs[]`
  (pacotes específicos em que a carta sai — é esse campo que resolve exclusividade de carta
  por pacote).
- `cards.extra.json` — dados extras de gameplay por carta (casado com `cards.json` pela
  chave `set`+`number`): `element`, `type`, `stage`, `health`, `retreatCost`, `weakness`,
  `evolvesFrom`, `goodWith`.

**Como importa:** `prisma/seed.ts`.

**Como atualizar** (ex: quando uma coleção nova for lançada):
```bash
npm run db:seed
```
Idempotente — faz upsert por `(collection.code)` e por `(collectionId, number)` da carta.
Nunca mexe em `Print.ownedQuantity`. Também é responsável por criar/vincular o `Print` de
cada carta (ver seção 3).

---

## 2. Imagens (cartas, pacotes, logos de coleção)

**Fontes:**
- Cartas: [`PocketDecks/pokemon-tcg-pocket-cards`](https://github.com/PocketDecks/pokemon-tcg-pocket-cards)
  (AGPL-3.0, ~140 estrelas). Caminho: `images/webp/cards/{slug-da-colecao}/{numero-com-3-digitos}.webp`.
  Cobertura validada em 2026-10-14: **100% das 4317 cartas do banco** (0 faltando, 0 sobrando).
- Pacotes e logos: [`flibustier/pokemon-tcg-pocket-database`](https://github.com/flibustier/pokemon-tcg-pocket-database)
  (mesma fonte da seção 1). Caminhos: `dist/images/packs/{NomeDoPacote}.webp` (só os 29
  pacotes "reais" têm arte — os pacotes promocionais "Vol. N" não têm) e
  `dist/images/sets/LOGO_expansion_{code}_en_US.webp`.

**Mapeamento de slug de coleção:** minúsculo do `code` (ex: `A2a` → `a2a`), exceto os
promocionais: `PROMO-A` → `pa`, `PROMO-B` → `pb`. Ver `PROMO_SLUGS` em `src/lib/images.ts`.

**Onde ficam salvas:** `public/images/` (cards/packs/sets) — **não vai pro git**
(`.gitignore`), ~150MB. Entram na imagem Docker porque o `Dockerfile` copia `public/`
inteiro antes do build.

**Como atualizar:**
```bash
npm run download:images
```
Idempotente (pula arquivo já baixado), concorrência de 16 downloads simultâneos. Precisa
rodar depois de `npm run db:seed` (usa os códigos/números já no banco pra saber o que
baixar) e sempre que entrar uma coleção nova.

**Detalhe de rede importante:** as imagens são buscadas via `raw.githubusercontent.com`,
não via CDN jsDelivr (`cdn.jsdelivr.net`). Descobrimos em 2026-10 que o jsDelivr resolve
pra um endereço que trava até dar timeout de dentro da rede Docker do container da app
neste ambiente, enquanto o raw do GitHub funciona normalmente. Se for trocar de CDN no
futuro, teste a conectividade de dentro do container (`docker compose exec app wget ...`)
antes de trocar.

---

## 3. Prints (cartas reimpressas/compartilhadas entre coleções)

**Não é uma fonte externa** — é derivado dos próprios dados da seção 1: quando duas
cartas (em coleções diferentes) têm o mesmo `image` (arte idêntica), elas são a mesma
"impressão física" e compartilham um `Print` (e portanto a mesma `ownedQuantity`). Isso é
comum nas coleções "Deluxe Pack" (ex: `B4b` reaproveita 236 das suas 429 cartas de 9
coleções B anteriores).

**Como atualiza:** automaticamente, dentro do `npm run db:seed` — cada carta importada
faz upsert de um `Print` por `imageUrl` único (nunca sobrescreve `ownedQuantity` num
`Print` já existente). Nenhum comando separado necessário.

---

## 4. Baralhos competitivos / meta

**Fonte:** [`PocketDecks/pokemon-tcg-pocket-tier-list`](https://github.com/PocketDecks/pokemon-tcg-pocket-tier-list)
(AGPL-3.0, código do site [pocketdecks.top](https://pocketdecks.top/)). Processa resultados
de torneios do [Limitless TCG](https://limitlesstcg.com/) e publica o resultado já
calculado como JSON estático em `public/data/` — não precisamos rodar nenhuma análise
estatística nós mesmos, só consumir o resultado pronto.

**Arquivo consumido:** `public/data/best-decks.json` — array de arquétipos, cada um com:
- `name` — slug único do arquétipo (ex: `"suicune-ex-a4a-020&baxcalibur-b2a-036"`,
  as duas "cartas-chave" separadas por `&`, cada uma no formato `{slug-coleção}-{numero}`)
- `popularity` / `percentOfGames` — % de presença no meta
- `expectedWinRate`, `powerScore`, `metaScore`, `fieldCoverage`, `freqScore` — métricas de força
- `lists[]` — variações de decklist conhecidas, cada uma com `cards` (array de strings
  `"quantidade:cartaId"`, ex: `"2:b2a-034"`) e um `score`/`strength` — usamos a de maior
  `score` como a lista "representativa" do arquétipo.

O `cartaId` usa o mesmo formato de slug que as imagens (seção 2): código da coleção em
minúsculo + número com 3 dígitos (`pa`/`pb` para promocionais).

Também usamos `public/data/meta-share.json` só pelo campo `generatedAt` (timestamp de
quando os dados de torneio foram processados, mostrado na tela de baralhos).

**Como importa:** `scripts/sync-decks.ts`.

**Como atualizar:**
```bash
npm run sync:decks
```
Reimporta a lista inteira a cada execução (apaga e recria `Deck`/`DeckCard` — esse dado
não é editado pelo usuário, então não precisa de upsert cuidadoso como as cartas). Decks
que saíram do meta (não aparecem mais no `best-decks.json` atual) são removidos. O site
de origem atualiza os dados com frequência (diária/semanal, conforme o próprio projeto);
não há atualização automática aqui — rode esse comando manualmente quando quiser dados
mais recentes.
