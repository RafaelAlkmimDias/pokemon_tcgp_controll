# Fontes de dados — Pokémon TCG Pocket (cartas, pacotes e coleções)

Pesquisa feita em 2026-10-14 para identificar de onde é possível obter dados estruturados
sobre cartas do Pokémon TCG Pocket, relacionando cada carta à sua coleção (set/expansão)
e ao(s) pacote(s) específico(s) em que ela pode ser obtida (incluindo cartas exclusivas
de um único pacote dentro de coleções com múltiplos pacotes).

## Bases de dados estruturadas (JSON)

### 1. flibustier/pokemon-tcg-pocket-database — https://github.com/flibustier/pokemon-tcg-pocket-database
A mais adequada para o caso de uso (carta → pacote → coleção).

- **`cards.json`** — campos por carta:
  - `set` — código da coleção (ex: `"A1"`)
  - `number` — número da carta dentro do set
  - `name` — nome da carta
  - `rarity` — `C`, `U`, `R`, `RR`, `AR`, `SR`, `SAR`, `IM`, `UR`
  - `image` — arquivo da arte da carta
  - `packs` — array com os nomes dos pacotes específicos em que a carta aparece
    (ex: `["Charizard", "Mewtwo", "Pikachu"]`). **É esse campo que resolve a
    exclusividade de carta por pacote.**
  - URL direta (raw): `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json`

- **`cards.extra.json`** — campos adicionais de gameplay:
  - `element` (tipo: grass, fire, water, lightning, psychic, fighting, darkness, metal, dragon, colorless)
  - `type` (pokemon, supporter, fossil)
  - `stage` (basic, 1, 2)
  - `health`, `retreatCost`, `weakness`
  - `evolvesFrom`
  - `goodWith` (array de sinergia, só para suportes)
  - URL: `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.extra.json`

- **`sets.json`** — coleções agrupadas por série (A, B):
  - `code` (ex: `"A1"`, `"A2a"`)
  - `releaseDate` (ISO 8601)
  - `count` (total de cartas no set)
  - `name` (multilíngue: en, fr, de, ja, es, it, pt, zh, ko)
  - `packs` (lista dos pacotes/temas do set, em nível de nome — a composição fina de
    cada pacote fica em `cards.json`, via o campo `packs` de cada carta)
  - URL: `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/sets.json`

- Também publicado como pacote npm; os JSONs crus podem ser consumidos diretamente
  (funcionam como uma "API" estática via raw.githubusercontent.com).

### 2. PocketDecks/pokemon-tcg-pocket-cards — https://github.com/PocketDecks/pokemon-tcg-pocket-cards
- Dados versionados, publicados no npm; os arquivos também funcionam como JSON puro (sem precisar do pacote).
- Múltiplos "payloads":
  - completo: todos os campos, ataques/habilidades aninhados, dados de troca (`deckBuilderNr` etc.)
  - gameplay: combate para simuladores (ataques, habilidades, stats), sem metadados de coleção
  - coleção: um registro por carta impressa, campos de troca derivados
- Não ficou claro, sem abrir `docs/payloads.md` no repo, se há marcação explícita de
  exclusividade por pacote — precisa confirmar antes de usar como fonte primária.

### 3. chase-manning/pokemon-tcg-pocket-cards
- Alternativa similar, JSON direto em:
  `https://raw.githubusercontent.com/chase-manning/pokemon-tcg-pocket-cards/refs/heads/main/v5.json`

## Sites de referência (sem API aberta — úteis para consulta manual/validação cruzada)

- **Limitless TCG Pocket** — https://pocket.limitlesstcg.com/cards
  Banco de dados por coleção, referência usada pela comunidade competitiva. No nível de
  listagem não detalha exclusividade por pacote.
- **Pokémon Zone** — https://www.pokemon-zone.com/packs/
  Lista os pacotes por expansão com as cartas exclusivas de cada um (bloqueou fetch
  automatizado com HTTP 403 — consulta deve ser manual/via navegador).
- **Game8** — https://game8.co/games/Pokemon-TCG-Pocket/archives/482685
  Card Dex completo do jogo.
- **PTCGPocket.gg** — https://ptcgpocket.gg/expansions/
  Expansões, datas de lançamento e spoilers completos de cartas.
- **pokemontcgpocket.app** — https://pokemontcgpocket.app/en/pack
  Navegação por pacote/expansão, pool de cartas por pacote e comparação entre pacotes irmãos.
- **Bulbapedia** — https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_Trading_Card_Game_Pocket_expansions
  Lista cronológica oficial de coleções/expansões lançadas.

## Modelo de dados possível

```
Coleção (set)
 └─ vários Pacotes (pack)
     └─ N cartas, algumas exclusivas de um único pacote

Carta
 ├─ set (coleção)
 ├─ packs[] (pacotes específicos em que pode sair)
 ├─ rarity, name, number, image
 └─ (extra) element, type, stage, health, retreatCost, weakness, evolvesFrom, goodWith
```

Com isso é possível saber, para cada carta: a qual coleção pertence, em quais pacotes
específicos pode sair, e identificar cartas exclusivas de um pacote dentro de uma coleção
com múltiplos pacotes. A fonte recomendada para isso é a `flibustier/pokemon-tcg-pocket-database`.

## Próximos passos em aberto
- Confirmar o schema de `docs/payloads.md` do PocketDecks caso se queira comparar/cruzar
  com a base do flibustier.
- Validar manualmente os dados de pelo menos uma coleção contra o jogo antes de usar como
  fonte definitiva (dados de projetos da comunidade podem ficar desatualizados após novos
  lançamentos).
