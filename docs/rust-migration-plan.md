# Plano — Migração para Rust (binário único, SQLite)

Plano combinado com o usuário em 2026-10-18. Motivação: incômodo de deixar o
Postgres e o Next.js (via `docker compose up`) rodando o tempo todo para um uso
esporádico. Decisão: reescrever como um único binário Rust (Axum + SQLite), sem
Docker nenhum — `cargo run`/`./pokemon-tcgp` abre instantaneamente, e o backup do
banco é só copiar um arquivo.

Projeto novo vive em `pokemon-tcgp/`, na raiz do repo, ao lado do projeto Next.js
atual. Os dois convivem até a migração estar completa; o Next.js **não foi
desativado**.

## Decisões já tomadas (não reabrir sem motivo novo)

- **Framework web**: Axum + Tokio.
- **Banco**: SQLite via `sqlx` (feature `runtime-tokio`, não `runtime-tokio-rustls`
  — essa feature não existe mais no `sqlx` 0.9; ver `pokemon-tcgp/Cargo.toml`).
  IDs trocados de `cuid()` para `INTEGER PRIMARY KEY AUTOINCREMENT` (sem motivo
  pra IDs distribuídos num app local de um usuário só). Enums (`Rarity`,
  `CardType`) armazenados como `TEXT` com `CHECK` (SQLite não tem enum nativo).
- **Templates**: Askama (compilado, tipado). `askama_axum` está deprecated no
  crates.io — em vez de depender dela, `src/web.rs` tem um `Render<T>` de uma
  linha que faz `T::render()` → `Html`.
- **Queries `sqlx`**: usar `sqlx::query_as` (runtime-checked), **não** a macro
  `query_as!` — a macro exige `DATABASE_URL` ou cache `.sqlx` versionado no
  momento do build, o que forçaria configurar isso antes de qualquer `cargo
  build` em máquina nova. Não vale a complexidade para um app de um usuário só.
- **Backup**: `VACUUM INTO` (ver `db::backup_to` em `pokemon-tcgp/src/db.rs`) —
  snapshot consistente sem bloquear leitores, ao contrário de copiar os bytes
  do arquivo `.db` direto (pode pegar o WAL no meio de um checkpoint).
- **Mutations** (incrementar quantidade, marcar baralho montado): forms HTML
  simples com `POST` + redirect 303, sem JS — mesmo padrão progressivo que os
  Server Actions do Next já usam hoje.
- **Regra obrigatória do projeto**: limpar cache de build do Rust (`cargo
  clean`) ao final de cada sessão — ver `AGENTS.md` na raiz do repo. Motivo: um
  único build gerou 1,5 GB em `target/`; já causou problema de HD cheio em
  outros projetos Rust do usuário antes.

## O que já está feito

- [x] Rust instalado via `rustup` (stable) na máquina atual — **precisa
      reinstalar em qualquer máquina nova**: `curl --proto '=https'
      --tlsv1.2 -sSf https://sh.rustup.rs | sh`.
- [x] Scaffold do projeto em `pokemon-tcgp/` (`cargo init`), dependências
      resolvidas em `Cargo.toml`/`Cargo.lock`.
- [x] Schema SQLite completo em `pokemon-tcgp/migrations/0001_init.sql`
      (mirror de `prisma/schema.prisma`, com os ajustes de ID/enum acima).
- [x] `pokemon-tcgp/src/db.rs` — pool de conexão, roda migrations no boot,
      `backup_to` via `VACUUM INTO`.
- [x] `pokemon-tcgp/src/locale.rs` — locale por cookie (mirror de
      `src/lib/i18n/locale.ts` + `getLocale.ts`).
- [x] `pokemon-tcgp/src/models.rs` — enums `Rarity`/`CardType` (mirror do
      Prisma), com `is_common()` e `css_class()` (mirror de `cardStats.ts` /
      `RARITY_CLASS` em `display.ts`).
- [x] `pokemon-tcgp/src/cardstats.rs` — mirror completo de
      `src/lib/cardStats.ts`.
- [x] `pokemon-tcgp/src/images.rs` — mirror completo de `src/lib/images.ts`
      (`PROMO_SLUGS`, `PACKS_WITH_ART`, as 3 funções de URL).
- [x] `pokemon-tcgp/src/display.rs` — mirror de `src/lib/display.ts`
      (`rarity_label`, `type_label`, `element_label`, `format_date`,
      `capitalize`, `format_percent`). `format_date` reimplementa o
      `Intl.DateTimeFormat` à mão (nomes de mês pt/en) em vez de puxar uma
      lib de calendário só por isso.
- [x] `pokemon-tcgp/src/i18n/dictionaries.rs` — **dicionário completo**
      pt/en, mirror 1:1 de `src/lib/i18n/dictionaries.ts` (todas as seções:
      `layout`, `home`, `decksPage`, `deckDetailPage`, `deckStar`,
      `decksList`, `cardCountLines`, `cardTile`, `cardFilter`, `breadcrumb`,
      `collectionPage`, `collectionCardsPage`, `packPage`,
      `cardDetailPage`, `rarity`, `cardType`, `element`, `display`). Os
      campos que eram função no TS (`home.series(name)`,
      `packAlt(packName)`, `stageValue(stage)` etc.) viraram funções livres
      no final do arquivo (`home_series`, `pack_page_title`,
      `card_detail_stage_value`, `card_detail_available_in_packs`, etc.).
- [x] `pokemon-tcgp/src/queries/collections.rs` — mirror de `getCollections`
      em `src/lib/queries.ts` (lista de coleções + stats agregadas).
- [x] `pokemon-tcgp/src/handlers/collections.rs` + `templates/layout.html` +
      `templates/collections_list.html` — rota `GET /` **funcionando de
      ponta a ponta** (testado manualmente: `cargo run`, SQLite criado em
      `data/pokemon_tcgp.db`, HTML renderizado corretamente em pt e en).

## O que falta

Rotas que ainda não existem (nem query, nem handler, nem template) — mirror
das páginas em `src/app/`:

- [ ] `GET /collections/:code` — mirror de `getCollectionDetail` +
      `src/app/collections/[code]/page.tsx` (packs com stats, cards sem pack).
- [ ] `GET /collections/:code/cards` — mirror de `getCollectionCards` +
      `src/app/collections/[code]/cards/page.tsx` (lista completa + filtro
      por nome — o filtro é client-side em `CardNameFilterGrid.tsx` hoje;
      decidir se vira JS vanilla ou busca no servidor).
- [ ] `GET /collections/:code/cards/:number` — mirror de `getCardDetail` +
      página de detalhe da carta (inclui "sibling cards" do mesmo `Print`
      reaproveitado em outras coleções).
- [ ] `GET /collections/:code/packs/:pack` — mirror de `getPackDetail`.
- [ ] `GET /decks` — mirror de `getDecks` (cálculo de `committedByBuiltDecks`,
      `sufficientCount` — ver `queries.ts` linhas 218-267, é a lógica mais
      complexa do projeto).
- [ ] `GET /decks/:slug` — mirror de `getDeckDetail`.
- [ ] Mutations:
  - [ ] `POST /prints/:id/increment` e `/decrement` (mirror de
        `incrementOwnedQuantity`/`decrementOwnedQuantity` em `actions.ts`).
  - [ ] `POST /decks/:id/toggle-built` (mirror de `toggleDeckBuilt`).
  - [ ] `POST /locale/:lang` (troca de idioma, seta cookie, redirect 303).
- [ ] `CardTile`/`CardCountLines`/`LanguageSwitcher` como componentes Askama
      reutilizáveis (hoje só existe o layout base).
- [ ] **Migração dos dados reais**: o Postgres atual (`pokemon_tcgp_controll-db-1`)
      tem quantidades possuídas (`ownedQuantity`) reais do usuário. Precisa de
      um script (dump do Postgres → `INSERT`s no SQLite) **antes** de
      desligar o container antigo. Ainda não escrito.
- [ ] Copiar `public/images/*` do projeto Next.js para `pokemon-tcgp/public/`
      (os caminhos gerados por `images.rs` esperam a mesma estrutura).
- [ ] Scripts auxiliares (`download-images.ts`, `sync-decks.ts`, `seed.ts`)
      continuam em Node por enquanto — não fazem parte do incômodo original
      (não ficam sempre rodando), portar depois se quiser independência total
      de Node.
- [ ] Testes: ainda não há nenhum teste no projeto Rust. Decisão pendente:
      `cargo test` com SQLite `:memory:`/arquivo temporário (elimina a
      necessidade do container `db_test` que a regra de cobertura de 80%
      exige hoje no Next.js).
- [ ] Decidir se `pokemon-tcgp/` fica neste mesmo repo Git (como está agora)
      ou vira repo próprio quando a migração terminar.

## Para continuar em outra máquina

1. Instalar Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   (depois `source "$HOME/.cargo/env"`).
2. `cd pokemon-tcgp && cargo run` — cria `data/pokemon_tcgp.db` automaticamente
   via migrations, sobe em `127.0.0.1:3000` (ou `PORT=xxxx cargo run` se a 3000
   já estiver ocupada por outro projeto).
3. **Sempre `cargo clean` ao terminar a sessão** (regra em `AGENTS.md`) —
   um único build já gerou 1,5 GB em `target/`.
4. Seguir a lista "O que falta" acima, na ordem em que aparece (cada rota
   depende dos módulos de domínio já prontos — `cardstats`, `display`,
   `images`, `i18n/dictionaries` — então é só escrever query + handler +
   template por página, seguindo o padrão de `queries/collections.rs` +
   `handlers/collections.rs`).
