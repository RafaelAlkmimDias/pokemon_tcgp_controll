# Plano — Migração para Rust (binário único, SQLite)

Plano combinado com o usuário em 2026-10-18. Motivação: incômodo de deixar o
Postgres e o Next.js (via `docker compose up`) rodando o tempo todo para um uso
esporádico. Decisão: reescrever como um único binário Rust (Axum + SQLite), sem
Docker nenhum — `cargo run`/`./pokemon-tcgp` abre instantaneamente, e o backup do
banco é só copiar um arquivo.

Projeto novo vive em `pokemon-tcgp/`, na raiz do repo, ao lado do projeto Next.js
atual. Os dois convivem até a migração estar completa; o Next.js **não foi
desativado**.

## Correção de rumo — 2026-10-18 (tarde): deixa de ser web

A primeira fase da migração (abaixo) chegou a um servidor HTTP completo
(Axum + Askama, aberto no navegador). O usuário esclareceu que a intenção
original nunca foi "trocar o motor web" — era deixar de ser web de vez e
virar um **app desktop nativo**, janela própria, sem navegador. Framework
escolhido: **egui/eframe** (puro Rust, sem GTK/Qt/webview).

Isso **substitui**, não só complementa, as decisões de "Framework web" e
"Templates" abaixo (mantidas nesta lista, riscadas, como registro do que
foi tentado primeiro — não foi perdido, só descartado: nada daquilo tinha
sido commitado). Decisões novas:

- **UI**: `egui`/`eframe` 0.37, não Axum/Askama. Ponte entre o sqlx async e
  o loop de frame síncrono do egui: `App` guarda um único
  `tokio::runtime::Runtime` e chama `rt.block_on(...)` só em clique/troca
  de tela (nunca a cada frame) — ver `pokemon-tcgp/src/app.rs`.
- **Imagens**: `images.rs` devolve fragmento de caminho relativo (sem
  `/images`, sem percent-encoding — é caminho de arquivo, não URL) e
  `egui_extras` (features `file`+`image`+`webp`) carrega via URI
  `file://...` — ver `pokemon-tcgp/src/ui/widgets/image.rs`.
- **Idioma**: persistido numa tabela `app_settings (key, value)` no mesmo
  SQLite (`migrations/0002_app_settings.sql`), não cookie — preserva a
  propriedade "um arquivo `.db` só = todo o estado do app" da decisão de
  backup via `VACUUM INTO` abaixo. Ver `pokemon-tcgp/src/settings.rs`.
- **Mutations**: chamadas diretas de função a partir da UI
  (`queries::mutations::*`), não mais HTML `POST`+redirect — não existe
  mais servidor HTTP, então o fix de redirect aberto/CSRF que tinha sido
  feito em `handlers/mutations.rs::same_origin_path` ficou moot e foi
  removido junto com o arquivo (a superfície de ataque desapareceu
  estruturalmente, não foi re-resolvida).
- `src/handlers/`, `src/chrome.rs`, `src/web.rs`, `templates/` inteiro:
  apagados (eram wiring HTTP/HTML puro, sem lógica própria). Dependências
  `askama`, `axum`, `axum-extra`, `tower`, `tower-http`, `urlencoding`
  removidas; `serde`/`serde_json` também (já estavam sem uso desde antes
  dessa virada).

A camada de dados (`db.rs`, `models.rs`, `cardstats.rs`, `display.rs`,
`i18n/dictionaries.rs`, `queries/*`) e os ~44 testes que a cobrem não
mudaram em nada — são independentes de HTTP desde o início.

## Decisões já tomadas (não reabrir sem motivo novo)

- ~~**Framework web**: Axum + Tokio.~~ Substituído por egui/eframe, ver
  "Correção de rumo" acima.
- **Banco**: SQLite via `sqlx` (feature `runtime-tokio`, não `runtime-tokio-rustls`
  — essa feature não existe mais no `sqlx` 0.9; ver `pokemon-tcgp/Cargo.toml`).
  IDs trocados de `cuid()` para `INTEGER PRIMARY KEY AUTOINCREMENT` (sem motivo
  pra IDs distribuídos num app local de um usuário só). Enums (`Rarity`,
  `CardType`) armazenados como `TEXT` com `CHECK` (SQLite não tem enum nativo).
- ~~**Templates**: Askama (compilado, tipado). `askama_axum` está deprecated no
  crates.io — em vez de depender dela, `src/web.rs` tem um `Render<T>` de uma
  linha que faz `T::render()` → `Html`.~~ Substituído por telas egui nativas
  em `pokemon-tcgp/src/ui/`, ver "Correção de rumo" acima.
- **Queries `sqlx`**: usar `sqlx::query_as` (runtime-checked), **não** a macro
  `query_as!` — a macro exige `DATABASE_URL` ou cache `.sqlx` versionado no
  momento do build, o que forçaria configurar isso antes de qualquer `cargo
  build` em máquina nova. Não vale a complexidade para um app de um usuário só.
- **Backup**: `VACUUM INTO` (ver `db::backup_to` em `pokemon-tcgp/src/db.rs`) —
  snapshot consistente sem bloquear leitores, ao contrário de copiar os bytes
  do arquivo `.db` direto (pode pegar o WAL no meio de um checkpoint).
- ~~**Mutations** (incrementar quantidade, marcar baralho montado): forms HTML
  simples com `POST` + redirect 303, sem JS — mesmo padrão progressivo que os
  Server Actions do Next já usam hoje.~~ Substituído por chamadas diretas de
  função, ver "Correção de rumo" acima.
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

Rotas de leitura (mirror das páginas em `src/app/`) — ✅ **feitas em
2026-10-18**, ver checklist detalhado e notas em
`docs/rust-migration-checklist.md` (bloco 1):

- [x] `GET /collections/:code`, `/collections/:code/cards`,
      `/collections/:code/cards/:number`, `/collections/:code/packs/:pack`,
      `/decks`, `/decks/:slug` — query + handler + template para cada uma,
      verificadas manualmente com dados de fixture.

Mutations — ✅ **feitas em 2026-10-18**, ver bloco 2 do checklist:

- [x] `POST /prints/:id/increment` e `/decrement` (mirror de
      `incrementOwnedQuantity`/`decrementOwnedQuantity` em `actions.ts`).
- [x] `POST /decks/:id/toggle-built` (mirror de `toggleDeckBuilt`).
- [x] `POST /locale/:lang` (troca de idioma, seta cookie, redirect 303) —
      rota funciona, mas ainda sem o `<select>` do `LanguageSwitcher` que a
      chamaria (bloco 3).

Componentes Askama reutilizáveis — ✅ **feitos em 2026-10-18**, ver bloco 3
do checklist:

- [x] `CardTile` (`templates/_card_tile.html`) — feito junto das mutations.
- [x] `CardCountLines` (`templates/_card_count_lines.html`) — agora mostra o
      `✓` de completo, que não existia antes.
- [x] `LanguageSwitcher` (`templates/_language_switcher.html`, incluído uma
      vez em `layout.html`) — dois forms `POST /locale/pt`/`/locale/en`, sem
      `<select>`+JS. Precisou de `src/chrome.rs::LayoutChrome` pra parar de
      duplicar os campos de layout em cada handler.

Dados e assets — ✅ **feitos em 2026-10-18**, ver bloco 4 do checklist:

- [x] **Migração dos dados reais**: `scripts/migrate-to-sqlite.ts`
      (`npm run migrate:sqlite`), rodado de verdade contra o
      `pokemon_tcgp_controll-db-1` real (não só fixture). Todas as
      contagens batem com o Postgres (24 coleções, 4317 cartas, soma de
      `ownedQuantity` 5879, etc.), zero linhas puladas.
      `pokemon-tcgp/data/pokemon_tcgp.db` já tem os dados reais.
- [x] Copiado `public/images/*` → `pokemon-tcgp/public/images/` (151MB,
      4370 arquivos). Imagens servindo certo via `cargo run`.

Testes — ✅ **feitos em 2026-10-18**, ver bloco 6 do checklist:

- [x] Estratégia: SQLite em arquivo temporário (`tempfile::TempDir` via
      `db::connect_for_test()`, só em `#[cfg(test)]`), não `:memory:` — e
      testes vivem como `#[cfg(test)] mod tests` dentro dos próprios
      módulos (sem precisar de `lib.rs`). 44 testes (unitários + integração
      contra o SQLite temporário), nunca tocam `data/pokemon_tcgp.db`.

O que falta agora:

- [ ] Scripts auxiliares (`download-images.ts`, `sync-decks.ts`, `seed.ts`)
      continuam em Node por enquanto — não fazem parte do incômodo original
      (não ficam sempre rodando), portar depois se quiser independência total
      de Node.
- [ ] Medir cobertura real (`cargo llvm-cov` ou similar) se quiser o
      percentual exato — não instalado ainda.
- [x] **Decidido em 2026-10-18**: `pokemon-tcgp/` fica neste mesmo repo Git.
      Quando a migração terminar, o Next.js e o Postgres são **removidos**
      do repositório (não só desligados) — ver bloco 7 do checklist para o
      que falta antes de executar essa remoção (ação destrutiva, confirmar
      com o usuário na hora).

## Para continuar em outra máquina

1. Instalar Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   (depois `source "$HOME/.cargo/env"`).
2. `cd pokemon-tcgp && cargo run` — cria `data/pokemon_tcgp.db` automaticamente
   via migrations (schema vazio), sobe em `127.0.0.1:3000` (ou
   `PORT=xxxx cargo run` se a 3000 já estiver ocupada por outro projeto).
   Pare o processo depois de criar o schema.
2a. Pra ter dados reais em vez de um banco vazio: com o Postgres antigo de pé
    (`docker compose up -d db`), `npm run migrate:sqlite` na raiz do repo —
    ver bloco 4 do checklist. Reaplica tudo (`--force`) se rodar de novo.
2b. Copiar `public/images/*` → `pokemon-tcgp/public/images/` (não vem pelo
    git, ~150MB) antes de abrir qualquer tela com arte de carta/pacote.
3. **Sempre `cargo clean` ao terminar a sessão** (regra em `AGENTS.md`) —
   um único build já gerou 1,5 GB em `target/`.
4. Seguir a lista "O que falta" acima, na ordem em que aparece (cada rota
   depende dos módulos de domínio já prontos — `cardstats`, `display`,
   `images`, `i18n/dictionaries` — então é só escrever query + handler +
   template por página, seguindo o padrão de `queries/collections.rs` +
   `handlers/collections.rs`).
