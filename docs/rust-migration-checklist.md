# Checklist — Migração para Rust

Passo a passo do que falta, na ordem recomendada (cada item depende dos
anteriores). Contexto completo e decisões já tomadas em
`docs/rust-migration-plan.md` — este arquivo é só a lista de execução.
Marque cada item (`[x]`) ao terminar; mantenha riscado o que já está feito.

Lembrete fixo (regra do `AGENTS.md`): **`cargo clean` ao final de cada
sessão** de trabalho no `pokemon-tcgp/`.

## 0. Virada pra app desktop nativo (egui/eframe) — ✅ feito em 2026-10-18

Os blocos 1-6 abaixo (datados do mesmo dia, de manhã) descrevem a primeira
fase da migração: um servidor HTTP completo (Axum + Askama), aberto no
navegador. Ficam como estão, riscados — é o registro real do que foi
feito, não uma versão errada da história. Mas o usuário esclareceu à
tarde que a intenção nunca foi "trocar o motor web": era virar um app
desktop nativo de vez. Ver `docs/rust-migration-plan.md` ("Correção de
rumo") para a decisão completa. Esta seção é a execução dessa virada:

- [x] `Cargo.toml`: removidas `askama`, `axum`, `axum-extra`, `tower`,
      `tower-http`, `urlencoding` (e `serde`/`serde_json`, que já estavam
      sem uso desde antes). Adicionadas `eframe`, `egui`, `egui_extras`
      (features `file`, `image`, `webp` — precisa das três: `file` pro
      loader de `file://`, `image`+`webp` pra decodificar `.webp`, já que
      todo o acervo de imagens é nesse formato).
- [x] `src/locale.rs` perdeu `from_cookie`/dependência de `axum_extra` —
      fica só o enum `Locale`. Persistência nova em `src/settings.rs`
      (tabela `app_settings`, `migrations/0002_app_settings.sql`) — ver
      "Correção de rumo" no plano pra motivação. 3 testes novos
      (round-trip, default, overwrite).
- [x] `images.rs`: `card_image_url`/`pack_image_url`/`collection_logo_url`
      passam a devolver fragmento de caminho relativo (`"cards/a1/007.webp"`,
      sem `/images`, sem `urlencoding::encode` — é caminho de arquivo, os
      nomes reais em disco têm espaço literal mesmo, ex.
      `"packs/Mega Altaria.webp"`). 4 testes atualizados.
- [x] `src/app.rs` — `Screen`/`ScreenData`/`Nav`/`Ctx`/`App`: navegação
      sem pilha (cada variante de `Screen` carrega os campos pra
      reconstruir breadcrumb), dados recarregados só ao trocar de tela ou
      depois de uma mutação (`rt.block_on` síncrono em clique, nunca a
      cada frame).
- [x] `src/ui/chrome.rs` (barra superior: Home, Decks, toggle PT/EN) +
      `src/ui/widgets/{card_tile,card_count_lines,image}.rs` +
      `src/ui/screens/{collections,collection_detail,collection_cards,
      card_detail,pack_detail,decks,deck_detail}.rs` — tradução direta de
      cada template Askama apagado pro widget/tela egui equivalente.
      Correção pontual: `card_detail.rs` agora mostra a imagem da carta
      (`image_url` já existia no struct, mas o template HTML antigo nunca
      renderizava esse campo).
- [x] Mutations (+/- de quantidade, toggle-built) ligadas de ponta a
      ponta: os widgets chamam `queries::mutations::*` direto e devolvem
      `Nav::Reload`, que recarrega a tela atual pela mesma função que troca
      de tela — uma única fonte de verdade pros stats.
- [x] Apagados: `src/handlers/` (5 arquivos), `src/chrome.rs`, `src/web.rs`,
      `templates/` inteiro (11 arquivos). Inclui o fix de redirect
      aberto/CSRF que tinha sido feito em
      `handlers/mutations.rs::same_origin_path` — ficou moot (sem servidor
      HTTP, não tem mais Referer nem requisição cross-site) e foi removido
      junto, não re-resolvido.
- [x] `cargo check`/`cargo test` limpos depois da limpeza — 44 testes
      passando (os mesmos de sempre: a camada de dados não mudou nada
      nessa virada).

**Pendência que só o usuário pode verificar**: todo o trabalho acima foi
validado por `cargo check`/`cargo test` e por rodar o binário até o ponto
em que ele tenta abrir a janela — o ambiente onde isso foi implementado
não tem servidor gráfico (`DISPLAY`/`WAYLAND_DISPLAY`), então a
renderização visual de cada tela **não foi verificada de verdade**. Falta
rodar `cargo run` numa sessão desktop normal e percorrer as 7 telas, as
duas mutations (+/-, toggle-built) e o toggle de idioma (confirmando que
persiste depois de fechar e abrir o app de novo).

## 1. Rotas de leitura (mirror de `src/app/`) — ✅ feito em 2026-10-18 (fase HTTP, substituída pelo bloco 0)

- [x] `GET /collections/:code` — `queries/collections.rs::get_collection_detail`
      + `handlers/collections.rs::detail` + `templates/collection_detail.html`.
      Packs com stats e cards sem pack.
- [x] `GET /collections/:code/cards` — `get_collection_cards` + `collections::cards`
      + `templates/collection_cards.html`. **Sem filtro por nome ainda** — a
      decisão JS-vanilla-vs-servidor continua pendente (não implementado, para
      não antecipar essa decisão); lista completa sem filtro por agora.
- [x] `GET /collections/:code/cards/:number` — `queries/cards.rs::get_card_detail`
      + `handlers/cards.rs::detail` + `templates/card_detail.html`. Inclui
      "sibling cards" do mesmo `Print` reaproveitado em outras coleções.
- [x] `GET /collections/:code/packs/:pack` — `queries/packs.rs::get_pack_detail`
      + `handlers/packs.rs::detail` + `templates/pack_detail.html`.
- [x] `GET /decks` — `queries/decks.rs::get_decks`. Lógica de
      `committedByBuiltDecks`/`sufficientCount` portada e verificada manualmente
      (deck construído reserva suas cópias, sem se penalizar pelas próprias
      cartas). **Sem os filtros por elemento/ordenação da UI React ainda** —
      mesma razão do item de cima (lista simples, ordenada por `meta_score`).
- [x] `GET /decks/:slug` — `get_deck_detail` + `handlers/decks.rs::detail` +
      `templates/deck_detail.html`.

Verificado manualmente com dados de fixture (collections/packs/cards/decks,
incluindo reprint entre coleções e deck construído reservando cópias) — todas
as rotas respondem 200 com dados corretos e 404 para código/pacote/carta/deck
inexistente. Correção lateral: `display::format_date` usava
`OffsetDateTime::parse`, que falha sem informação de fuso e caía sempre no
fallback "data desconhecida" — trocado por `Date::parse`. Também corrigido
`ServeDir` (estava montado em `/public`, mas `images.rs` gera URLs em
`/images/...`) e adicionado `target/` ao `.gitignore` do projeto Rust (regra
do `AGENTS.md`, estava faltando desde o scaffold inicial).

Pendências que ficaram para trás de propósito (não bloqueiam as rotas):
- Filtro por nome (cards) e filtros/ordenação (decks) da UI React — ver acima.
- `CardCountLines`/`LanguageSwitcher` como componentes Askama — ver bloco 3.

## 2. Mutations — ✅ feito em 2026-10-18

- [x] `POST /prints/:id/increment` e `/decrement` — mirror de
      `incrementOwnedQuantity`/`decrementOwnedQuantity` em `actions.ts`
      (`queries/mutations.rs::adjust_owned_quantity`,
      `handlers/mutations.rs::increment`/`decrement`). Clamp em 0 no
      decrement, 404 se o print não existir.
- [x] `POST /decks/:id/toggle-built` — mirror de `toggleDeckBuilt`
      (`queries/mutations.rs::toggle_deck_built`,
      `handlers/mutations.rs::toggle_built`). 404 se o deck não existir.
- [x] `POST /locale/:lang` — `handlers/mutations.rs::set_locale`. Seta o
      cookie `locale` (365 dias, `SameSite=Lax`) e redireciona; locale
      inválido é ignorado silenciosamente (mesmo comportamento do
      `isLocale` guard em `actions.ts`). **Sem UI própria ainda** — o
      `<select>` do `LanguageSwitcher` é bloco 3; a rota existe e funciona,
      só não há botão/link que a chame hoje.

Todas as três são formulários HTML simples (`POST` + redirect 303 via
`Referer`, com fallback pra `/`), sem JS — decisão já registrada em
`docs/rust-migration-plan.md`. Os botões +/- e a estrela de "montado" nas
páginas de coleção/pacote/carta/deck agora são forms reais (antes só
mostravam a quantidade/estado, sem ação). Extraído `templates/_card_tile.html`
como partial Askama (`{% include %}`) nas quatro páginas que listam cartas,
já que os quatro precisavam do mesmo markup de formulário +/- — isso cobre o
item "CardTile" do bloco 3 abaixo.

Verificado manualmente: increment/decrement respeitam o clamp em 0, 404 em
print/deck inexistente, toggle-built ida-e-volta, cookie de locale setado só
para "pt"/"en".

**Correção de segurança em 2026-10-18** (achado no `/code-review`):
`redirect_back()` em `handlers/mutations.rs` passava o header `Referer` —
controlado pelo cliente — direto pro `Redirect::to`, um redirect aberto
encadeado em toda mutação (sem token CSRF nessas rotas, qualquer site
externo podia fazer um form POST aqui e o servidor redirecionava pro
domínio do atacante). Trocado por `same_origin_path()`: extrai só o
caminho+query do Referer (descartando esquema/host de uma URL absoluta) e
rejeita qualquer coisa que não seja um caminho relativo inequívoco — em
especial `//evil.com/x`, que o navegador resolve pro host `evil.com`
(scheme-relative), não como um caminho. Cai em `/` quando o Referer falta
ou é rejeitado. Cobertura com 3 testes novos em
`handlers/mutations.rs::tests`. **Não corrigido**: a ausência de token CSRF
em si (a mutação continua executando mesmo vindo de outro site) — isso é
uma mudança maior, deixada de propósito para decidir depois se vale a pena
num app local de um usuário só.

## 3. Componentes Askama reutilizáveis — ✅ feito em 2026-10-18

- [x] `CardTile` — feito junto do bloco 2 (`templates/_card_tile.html`).
- [x] `CardCountLines` — `templates/_card_count_lines.html`. Espera `stats`,
      `cards_label`, `total_cards_label`, `complete_aria_label` no escopo;
      quando o valor não se chama `stats` direto (ex. `pack.stats`), usa
      `{% let stats = pack.stats %}` antes do `{% include %}`. Agora mostra
      o `✓` quando a contagem bate (antes só mostrava o número, sem check).
- [x] `LanguageSwitcher` — `templates/_language_switcher.html`, incluído uma
      vez em `layout.html` (então toda página ganha de graça). Dois forms
      `POST /locale/pt` e `/locale/en` (sem `<select>`+JS como o TS, já que
      a regra do projeto é forms simples sem JS) — o idioma atual aparece
      como texto plano, o outro como botão. Precisou de um novo
      `src/chrome.rs::LayoutChrome` (html_lang/meta_title/.../locale atual +
      os 3 textos do switcher) porque esses campos viviam duplicados em
      cada handler; agora cada `Template` tem um único campo `chrome`.

Verificado manualmente: `✓` aparece só quando owned==total e total>0 (testado
pack completo vs incompleto); troca de idioma via `POST /locale/pt` seta o
cookie e o header passa a mostrar "Português" fixo com "English" como botão
(e vice-versa); sweep completo das rotas sem regressão.

## 4. Dados e assets (fazer antes de desligar o Postgres) — ✅ feito em 2026-10-18

- [x] Escrever script de migração **Postgres → SQLite**:
      `scripts/migrate-to-sqlite.ts` (`npm run migrate:sqlite`). Lê tudo do
      Postgres via Prisma (só leitura, nunca escreve nele) e grava no SQLite
      via `node:sqlite` (builtin do Node, sem dependência nova — Node 22.5+;
      confirmado funcionando no Node 24.18 instalado aqui). Remapeia os ids
      cuid (string) do Postgres para os ids `INTEGER AUTOINCREMENT` do
      SQLite, guardando um `Map` por tabela pra resolver as foreign keys das
      tabelas filhas. Por padrão recusa rodar se o destino já tiver dados
      (`--force` apaga e reimporta); exige que o schema já exista no SQLite
      (rodar `cd pokemon-tcgp && cargo run` uma vez antes, não duplica
      `migrations/0001_init.sql`).
- [x] Copiar `public/images/*` do projeto Next.js para `pokemon-tcgp/public/`
      — `cp -r public/images pokemon-tcgp/public/images` (151MB, 4370
      arquivos, contagem confere dos dois lados). Adicionado
      `public/images/` ao `.gitignore` do `pokemon-tcgp/`, mesma regra que
      já existia do lado do Next.js.

Rodado de verdade contra o Postgres real (`pokemon_tcgp_controll-db-1`, que
estava de pé) — não foi só testado com fixture. Conferido bate-a-bate contra
o Postgres: `collections` 24, `packs` 55, `prints` 3866, `cards` 4317,
`card_packs` 4522, `decks` 44, `deck_cards` 574, soma de `ownedQuantity`
5879, 0 decks marcados como montados — tudo igual nos dois bancos, sem
nenhuma linha pulada. Confirmado visualmente: `cargo run` servindo o SQLite
migrado, home mostra as 24 coleções reais com contagens reais (inclusive o
`✓` de completo numa coleção 72/72), `/decks` mostra os 44 baralhos reais
com os cálculos de disponibilidade certos, e as imagens reais (`/images/packs/*.webp`,
`/images/cards/*/*.webp`, `/images/sets/*.webp`) respondem 200 com o
content-type certo. `pokemon-tcgp/data/pokemon_tcgp.db` agora tem os dados
reais (preservado, não é mais fixture de teste — `.gitignore` já cobre).

**Ainda não feito** (fora do escopo deste bloco, mas relacionado): o
`card_tile.rs`/`CardDetailTemplate` já carregam `image_url` mas as telas de
carta individual ainda não têm a tag `<img>` (só os pacotes mostram arte
hoje) — ajuste de UI pendente, não é um problema de dados/pipeline.

## 5. Scripts auxiliares (podem ficar em Node por enquanto)

- [ ] (opcional, baixa prioridade) Portar `download-images.ts` para Rust.
- [ ] (opcional, baixa prioridade) Portar `sync-decks.ts` para Rust.
- [ ] (opcional, baixa prioridade) Portar `seed.ts` para Rust.

## 6. Testes — ✅ feito em 2026-10-18

- [x] Estratégia decidida: **arquivo temporário**, não `:memory:` — com
      `max_connections(5)` no pool, uma URI `:memory:` pura daria um banco
      vazio diferente pra cada conexão nova em vez de um banco compartilhado.
      `db::connect_for_test()` (só em `#[cfg(test)]`, em `src/db.rs`) cria um
      `tempfile::TempDir`, abre o SQLite nele via `db::connect` (migrations
      rodam normalmente) e devolve `(pool, TempDir)` — o diretório (e o
      `.db`/`.db-wal`/`.db-shm`) é apagado sozinho quando o `TempDir` sai de
      escopo no fim do teste. Nunca toca `data/pokemon_tcgp.db` (dado real,
      confirmado pelo mtime do arquivo antes/depois do `cargo test`).
      Elimina mesmo a necessidade do container `db_test` que a regra de
      cobertura de 80% exige hoje no Next.js — ver `feedback_testing_rules`
      na memória do usuário.
- [x] Sem `lib.rs`: os testes vivem como `#[cfg(test)] mod tests` dentro dos
      próprios arquivos (`src/display.rs`, `cardstats.rs`, `images.rs`,
      `models.rs`, `locale.rs`, `queries/mod.rs`, `queries/collections.rs`,
      `queries/cards.rs`, `queries/packs.rs`, `queries/decks.rs`,
      `queries/mutations.rs`) — um crate binário já permite testes unitários
      nos seus próprios módulos, sem precisar reestruturar em bin+lib só
      pra isso.
- [x] Fixtures de banco compartilhadas em `src/test_support.rs` (só
      `#[cfg(test)]`, declarado condicionalmente em `main.rs`): helpers
      `insert_collection`/`insert_pack`/`insert_print`/`insert_card`/
      `link_card_pack`/`insert_deck`/`link_deck_card` pra montar fixtures
      sem repetir SQL cru em cada arquivo de teste.
- [x] 44 testes escritos e passando (`cargo test`): unitários para as
      funções puras (`display`, `cardstats`, `images`, `models::Rarity`,
      `locale`, `queries::resolve_name`) e de integração contra o SQLite
      temporário para as cinco queries e as duas mutations — cobrindo os
      casos de borda documentados nos comentários do código (fallback de
      nome pt→en, card sem pack, card exclusivo de um único pack entre vários,
      sibling cards entre coleções, clamp em 0, e a reserva de cópias por
      baralho montado sem se penalizar pelas próprias cartas).
- [ ] Número de cobertura real (ex. via `cargo llvm-cov`) não foi medido —
      a ferramenta não está instalada e instalá-la fica pra depois, se o
      usuário quiser o percentual exato. A extensão dos testes acima cobre
      toda a lógica de negócio das queries/mutations e os módulos puros;
      só os `handlers/*` (wiring fino do Axum) e `main.rs` ficaram de fora.

## 7. Decisão final — decidido em 2026-10-18, execução pendente

- [x] `pokemon-tcgp/` fica neste mesmo repo Git (não vira repo próprio).
      Quando a migração terminar, o Next.js (raiz do repo, `src/`, `prisma/`,
      `docker-compose.yml`/Postgres etc.) é **removido** do repositório, não
      só desligado — o repo passa a conter só o projeto Rust. `pokemon-tcgp/`
      deixa de ser um subdiretório "convivendo" com o Next.js e passa a ser
      o conteúdo do repo (decidir depois, na hora de executar, se promove
      os arquivos pra raiz ou deixa o repo com `pokemon-tcgp/` como único
      subdiretório — ainda não decidido, não bloqueia nada antes disso).
- [ ] Ainda **não executar** essa remoção agora: faltam os itens opcionais
      do bloco 5 (ou decidir explicitamente abandoná-los) e confirmar que
      não há mais nenhuma dependência do app Next.js/Postgres sendo usada
      (ex.: `scripts/migrate-to-sqlite.ts` só serve enquanto o Postgres
      existe — depois de rodado por último, não há mais motivo pra manter
      o Postgres de pé).
- [ ] Quando for executar: apagar o código Next.js (`src/`, `prisma/`,
      `public/` do lado Next.js, `docker-compose.yml`, configs do Next
      como `next.config.*`, `package.json`/`package-lock.json` da raiz) e
      remover o container/volume do Postgres (`docker compose down -v` ou
      equivalente) — **ação destrutiva, confirmar com o usuário antes de
      rodar**, mesmo já estando decidido que vai acontecer.
