# Plano — Seleção de idioma (PT/EN), incluindo as cartas

Pesquisa e plano feitos em 2026-10-16. Escopo combinado com o usuário: **apenas
português e inglês**, em 2 etapas. Tradução do texto do app pode ser feita por nós;
tradução de nome/dado de carta **não pode ser feita por nós** — só usando uma fonte
confiável já publicada, nunca uma tradução própria.

## O que a pesquisa confirmou sobre a fonte de dados atual

O projeto usa `flibustier/pokemon-tcg-pocket-database` (ver
`docs/pokemon-tcgp-data-sources.md` e `prisma/seed.ts`). Verificado diretamente nos
JSONs publicados pelo repositório:

- **`sets.json`** já traz o nome da coleção em vários idiomas, incluindo `pt`
  (`name: { en, fr, de, zh, pt, es, it, ja, ko }`). Hoje `prisma/seed.ts` descarta
  isso e grava só `rawSet.name.en ?? rawSet.code`. **Dá para usar nome de coleção em
  português agora, sem depender de nenhuma fonte nova.**
- **`cards.json`** (nome de cada carta) só tem uma string única, em inglês — não é
  multilíngue. Existem variantes da comunidade `cards.fr.json` e `cards.de.json`
  (e os respectivos `cards/fr/*.json`, `cards/de/*.json`), mas **não existe
  `cards.pt.json`**. Conferindo amostras de `cards.fr.json` (ex: cartas #1, #4–#7 do
  set A1), os nomes vieram idênticos ao inglês ("Caterpie", "Metapod" em vez dos
  nomes franceses reais) — ou seja, mesmo o francês/alemão estão incompletos nesse
  repositório. **Hoje não existe, nesse pipeline, uma fonte confiável de nomes de
  carta em português.**
- **Imagem da carta** (`image` em `cards.json`) é o mesmo arquivo para inglês, francês
  e alemão nas amostras verificadas — é um único asset por carta
  (`scripts/download-images.ts` baixa de `PocketDecks/pokemon-tcg-pocket-cards`), sem
  variante visual por idioma. **Não existe fonte de arte traduzida no pipeline atual.**

Essas descobertas definem o que é possível fazer agora (Etapa 2a) e o que fica
bloqueado até surgir fonte melhor (Etapas 2b e 2c).

---

## Etapa 1 — Idioma da interface (PT/EN)

Objetivo: um seletor de idioma que traduz todo o texto do app (labels, botões,
títulos, rótulos de raridade/elemento/tipo) **sem mexer nos dados das cartas**.

- [x] Mecanismo de persistência: **cookie** HTTP (`locale`, padrão `"pt"`), lido nos
      Server Components via `next/headers` `cookies()` e gravado por uma Server
      Action (`src/lib/i18n/actions.ts`). Descartado o segmento de rota `[locale]`
      por exigir reestruturar toda a árvore de rotas e todos os `Link`/`href`
      existentes só para uma preferência de idioma por visitante, sem necessidade
      de URLs indexáveis por idioma.
- [x] Biblioteca: **dicionário próprio**, sem `next-intl`/lib externa. Projeto é
      pequeno (~10 arquivos, 2 idiomas), majoritariamente Server Components, e um
      dicionário simples em `src/lib/i18n/` fica totalmente tipado e fácil de
      testar com o Vitest já configurado (necessário para manter os 80% de
      cobertura) sem adicionar dependência nova.
- [x] Extrair as strings fixas em português para o dicionário, arquivo por arquivo:
  - [x] `src/app/page.tsx`
  - [x] `src/app/decks/page.tsx`
  - [x] `src/app/decks/[slug]/page.tsx`
  - [x] `src/app/collections/[code]/page.tsx`
  - [x] `src/app/collections/[code]/cards/page.tsx`
  - [x] `src/app/collections/[code]/cards/[number]/page.tsx`
  - [x] `src/app/collections/[code]/packs/[pack]/page.tsx`
  - [x] `src/app/layout.tsx`
  - [x] `src/components/DecksList.tsx`
  - [x] `src/components/CardNameFilterGrid.tsx` (placeholder "Filtrar por nome...")
  - [x] `src/lib/display.ts` (`RARITY_LABEL`, `ELEMENT_LABEL` e afins — são rótulos de
        interface para códigos de enum, não nomes de carta: podemos traduzir à vontade)
- [x] Criar os dicionários `pt` e `en` com as chaves extraídas acima
      (`src/lib/i18n/dictionaries.ts`). Nota: entradas usadas por Client Components
      (`cardTile`, `cardFilter`, `decksList`, `deckStar`, `languageSwitcher`) tiveram
      que ficar como strings puras, nunca funções — React não serializa funções ao
      cruzar a fronteira Server→Client, e isso só quebra em runtime real
      (`next dev`/E2E), não nos testes unitários com render direto em jsdom.
- [x] Adicionar um seletor de idioma visível (`LanguageSwitcher`, no `site-header`),
      refletindo o idioma atual.
- [x] Persistir a escolha do usuário entre sessões/recarregamentos (cookie `locale`,
      1 ano, `path=/`, gravado pela Server Action `setLocale`).
- [x] Testar a troca de idioma em todas as rotas listadas acima (sem quebrar
      formatação de `%`, datas, pluralização de "carta(s)") — cobertura automatizada
      em `e2e/language-switcher.spec.ts` + verificação visual manual (home, decks,
      pacote, detalhe de carta com todos os campos preenchidos) nos dois idiomas.
- [x] Rebuildar o container Docker (`docker compose up -d --build app`) e validar
      manualmente as telas principais nos dois idiomas.

## Etapa 2 — Idioma das cartas

### 2a. Nome da coleção/set — concluído

- [x] Alterado `prisma/schema.prisma`: `Collection.name` continua o nome "canônico"
      (inglês), e foi adicionado `namePt String?` (nullable, com fallback para `name`
      quando ausente). Preferido a uma tabela `CollectionTranslation` separada por
      serem só 2 idiomas e um campo a mais já resolver sem over-engineering.
- [x] Atualizado `prisma/seed.ts` para gravar `rawSet.name.en` **e** `rawSet.name.pt`.
- [x] Rodado `npx prisma db push` (schema) e `npm run db:seed` (dados) contra o banco
      de produção, com consentimento explícito do usuário em 2026-10-16 — ambos
      passam pelo bloqueio de ação perigosa do próprio Prisma para agentes de IA.
      Resultado: só `A1` e `A1a` têm `namePt` hoje (são as únicas com tradução pt na
      fonte `sets.json` atualmente — ver nota abaixo); as outras 22 coleções caem no
      fallback em inglês até a fonte publicar mais traduções.
- [x] `src/lib/queries.ts` resolve o nome certo por idioma em toda função que devolve
      uma coleção (`getCollections`, `getCollectionDetail`, `getCollectionCards`,
      `getPackDetail`, `getCardDetail` — incluindo o nome da coleção de cada carta
      "irmã"/reimpressão).
- [x] Telas que exibem `collection.name` não precisaram de alteração própria: já
      liam `collection.name` direto, e a resolução por idioma acontece antes, na
      query. Coberto por `e2e/collection-name-localization.spec.ts`.

**Nota sobre cobertura da tradução:** a fonte (`flibustier/pokemon-tcg-pocket-database`,
`sets.json`) só tem `pt` preenchido para 2 das 24 coleções no momento desta
implementação. O mecanismo está pronto para as outras 22 assim que a fonte publicar
mais traduções — não é necessário nenhum trabalho adicional do lado do app, só rodar
`npm run db:seed` de novo.

### 2b. Nome de cada carta — concluído (fonte encontrada: pokemongohub.net)

O usuário apontou `https://pocket.pokemongohub.net/pt` como fonte. O site fica atrás
de proteção anti-bot da Cloudflare (não dá pra buscar programaticamente), mas o
usuário forneceu uma cópia salva completa da página "Todas as cartas" em
2026-10-16, que embute o dataset inteiro (~4306 cartas) num payload RSC do
Next.js usado para filtragem client-side — mesmo sem rolar a tela inteira.

- [x] Extraído o payload (`self.__next_f.push(...)` → `initialCards`), mapeado por
      ID interno de asset do jogo (ex. `PK_10_000010_00`, o mesmo embutido no nome
      do arquivo de imagem que já usamos) contra o nome em português. Confirmado como
      fonte confiável (não tradução nossa): nomes de NPC batem com localizações
      oficiais conhecidas (ex. "Hau"→"Hibi", "Ilima"→"Luan", "Iono"→"Kissera").
- [x] `prisma/schema.prisma`: `Card.namePt String?`, mesmo padrão de fallback do 2a.
- [x] Dados salvos em `prisma/data/card-names-pt.json` + `prisma/data/README.md`
      (proveniência, formato, limitações, como atualizar). **Diferente do 2a**: não é
      uma fonte buscável ao vivo — é um snapshot estático, versionado no repo;
      atualizar significa salvar a página de novo manualmente.
- [x] `prisma/seed.ts` casa cada carta pelo ID de asset extraído de `card.image`, e
      só aceita a tradução se o nome em inglês da própria fonte bater com o nosso
      (`card.name`) — proteção contra erros pontuais na fonte.
- [x] Mesmo com essa proteção, 2 erros pontuais passaram (o campo `pt` da fonte
      apontava pra uma carta errada, com o campo `en` da mesma linha *correto* —
      "Machamp" tinha `pt: Machop`, "Nidoran♀" tinha `pt: Nidoran♂"). Achados numa
      checagem manual por amostragem, removidos à mão de `card-names-pt.json`
      (documentado lá). Uma amostra aleatória maior depois não achou mais nenhum.
- [x] `src/lib/queries.ts`: mesmo helper `resolveCardName` aplicado em toda função
      que devolve carta (`getCollectionCards`, `getCollectionDetail`,
      `getPackDetail`, `getCardDetail`, `getDeckDetail`) — zero mudança nas telas,
      elas já liam `card.name` direto. O filtro de nome (`CardNameFilterGrid`)
      passa a buscar pelo nome já traduzido de graça, sem nenhuma mudança própria.
- [x] Aplicado no banco de teste e produção com consentimento explícito do usuário
      em 2026-10-16. Cobertura real: 3791/4317 cartas (≈88%) têm `namePt`; o resto
      cai no fallback em inglês (sets `B4`/`B4a`, muito recentes na época do
      snapshot, mais alguns casos pontuais excluídos por segurança).
- [x] Coberto por `e2e/collection-name-localization.spec.ts` (segundo teste no
      arquivo) e pelos testes de integração em `src/lib/queries.integration.test.ts`
      (`describe("card name localization")`).

### 2c. Arte da carta — fora de escopo por enquanto

- [ ] Documentar (este arquivo já cobre isso) que a arte é um único asset por carta,
      sem variante por idioma, na fonte usada hoje (`scripts/download-images.ts` →
      `PocketDecks/pokemon-tcg-pocket-cards`).
- [ ] Se uma fonte de imagens por idioma surgir no futuro, reavaliar esta etapa; até
      lá, a arte da carta não muda com o idioma selecionado.
