# Testes

Regra do projeto: **pelo menos 80% de cobertura**, com testes unitários e de
integração. O banco de dados real (usado por `npm run dev` e pelo container
`app` do Docker Compose) é tratado como produção e **nunca** é tocado pelos
testes.

## Como rodar

```bash
npm test              # sobe o banco de teste (se preciso) e roda unitários + integração
npm run test:watch    # idem, em modo watch
npm run test:coverage # idem, com relatório de cobertura (html em coverage/)
npm run test:e2e      # sobe o banco de teste e roda os testes E2E (Playwright)
npm run test:e2e:ui   # idem, no modo interativo do Playwright
```

Na primeira vez (ou depois de alterar `prisma/schema.prisma`), é preciso
também aplicar o schema no banco de teste:

```bash
npm run test:db:push
```

Esse comando é protegido pelo guard de segurança do próprio Prisma contra
ações destrutivas disparadas por agentes de IA — ele pede confirmação
explícita antes de rodar. É normal e esperado.

Para derrubar o container do banco de teste:

```bash
npm run test:db:down
```

## Isolamento do banco de teste

- O banco real roda no serviço `db` do `docker-compose.yml` (porta `5432`,
  variável `DATABASE_URL`, volume persistente `db_data`).
- O banco de teste roda num serviço **separado**, `db_test` (porta `5434`,
  variável `TEST_DATABASE_URL`, armazenamento em `tmpfs` — ou seja, os dados
  somem quando o container para). Ele só sobe quando pedido explicitamente
  (`--profile test`), nunca com um `docker compose up` comum.
- `src/test/testPrisma.ts` cria um `PrismaClient` dedicado, apontado só para
  `TEST_DATABASE_URL`. Se essa variável não existir, ou se a string de conexão
  não parecer claramente ser a de teste, ele lança um erro em vez de arriscar
  continuar. Essa variável nunca é usada pelo app de verdade (que só lê
  `DATABASE_URL`), então não tem como um `.env` ausente "cair" sozinho na base
  de produção.
- Os testes de integração substituem o `prisma` real pelo `testPrisma` via
  `vi.mock("@/lib/prisma", ...)` — ou seja, o código de produção
  (`src/lib/prisma.ts`) nunca chega a ser importado/executado durante os
  testes de integração, só o mock.
- `resetTestDatabase()` (em `src/test/testPrisma.ts`) limpa todas as tabelas
  do banco de teste antes de cada teste de integração, para eles começarem
  isolados uns dos outros.

## Organização

- **Testes unitários** (`*.test.ts(x)`, sem tocar banco):
  - `src/lib/cardStats.test.ts`, `src/lib/display.test.ts`,
    `src/lib/images.test.ts` — funções puras.
  - `src/components/*.test.tsx` — componentes React (jsdom + Testing
    Library), com `@/lib/actions` mockado e `next/image` trocado por um
    `<img>` simples (ver `src/test/setupUnit.ts`).
- **Testes de integração** (`*.integration.test.ts`, usam o `db_test` real
  via Prisma):
  - `src/lib/queries.integration.test.ts`, `src/lib/actions.integration.test.ts`.
  - Fixtures reutilizáveis em `src/test/fixtures.ts` (criar Collection, Print,
    Card, Pack, Deck, DeckCard rapidamente).

## E2E (Playwright)

- `playwright.config.ts` carrega `.env.test` e recusa rodar se
  `TEST_DATABASE_URL` não existir ou não parecer claramente ser o banco de
  teste (mesma blindagem usada pelos testes de integração).
- O servidor Next.js usado pelos testes (`webServer` do Playwright) é subido
  via `next dev -p 3100`, com `DATABASE_URL` **sobrescrito para
  `TEST_DATABASE_URL`** só nesse processo — o código do app
  (`src/lib/prisma.ts`) não muda, só o valor da env var com que ele sobe
  nesse servidor específico. O servidor real (`npm run dev`, porta 3000, ou o
  container `app`) nunca é tocado.
- `e2e/global-setup.ts` roda uma vez antes da suíte: limpa o banco de teste
  (`resetTestDatabase()`) e semeia um dataset pequeno e determinístico via
  `src/test/fixtures.ts` (uma coleção, um pacote, algumas cartas e 4 baralhos,
  cada cenário usando cartas/prints isolados dos outros para as specs não
  interferirem entre si).
- As specs ficam em `e2e/*.spec.ts`:
  - `card-name-filter.spec.ts` — o filtro flutuante por nome (tela de pacote
    e de "todas as cartas"), incluindo o caso "sem resultado".
  - `card-owned-quantity.spec.ts` — os botões +/- de quantidade possuída,
    passando de fato pela server action e pela revalidação da página.
  - `decks-sort-and-filter.spec.ts` — o controle de ordenação da lista de
    baralhos.
  - `deck-built-reserves-cards.spec.ts` — o cenário mais importante: marcar
    um baralho como montado reduz a quantidade disponível daquela carta para
    outro baralho que a usa, e volta ao normal ao desmarcar.
- Só o navegador Chromium está instalado/configurado por padrão
  (`npx playwright install chromium`); para rodar em Firefox/WebKit também,
  adicione os projetos correspondentes em `playwright.config.ts`.

## O que fica de fora da cobertura, e por quê

`src/app/**/page.tsx` (as rotas) são Server Components `async`. O próprio guia
oficial do Next.js para Vitest afirma que Server Components assíncronos ainda
não são suportados para teste unitário com Vitest, recomendando testes E2E
para eles. Por isso essas páginas ficam fora do cálculo de cobertura — a
lógica de negócio que elas usam (`src/lib/queries.ts`, `src/lib/actions.ts`)
é coberta via teste de integração, e a renderização em si é verificada
manualmente (`npm run dev` / rebuild do container `app`) a cada mudança.
`src/lib/prisma.ts` também fica fora: é só a configuração do client do
Prisma, sem lógica própria para testar sem um banco real.
