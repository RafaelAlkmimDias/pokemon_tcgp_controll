# Pokemon TCGP Controll

App para acompanhar coleções, pacotes e cartas do Pokémon TCG Pocket.

## Stack

- Next.js + TypeScript
- PostgreSQL via Prisma ORM (driver adapter `@prisma/adapter-pg`, sem engine Rust)
- Docker / Docker Compose para app e banco, cada um com limite de CPU e memória

## Modelo de dados

```
Collection (coleção/set, ex: "A1 - Genetic Apex")
 └─ Pack[]      (pacotes da coleção, ex: "Charizard", "Mewtwo", "Pikachu")
 └─ Card[]      (cartas da coleção)
      └─ Pack[] (em quais pacotes específicos a carta pode sair — relação N:N via CardPack)
```

Uma carta pertence a uma coleção e pode sair em um ou mais pacotes dessa coleção.
Isso permite identificar cartas exclusivas de um único pacote dentro de coleções com
múltiplos pacotes (ex: a carta "Mewtwo" só sai no pacote "Mewtwo" da coleção A1, mesmo
a coleção A1 tendo também os pacotes "Charizard" e "Pikachu").

Veja `prisma/schema.prisma` para o schema completo (`Collection`, `Pack`, `Card`, `CardPack`).

## Fonte dos dados

Os dados de cartas/pacotes/coleções são importados de
[`flibustier/pokemon-tcg-pocket-database`](https://github.com/flibustier/pokemon-tcg-pocket-database)
(`sets.json`, `cards.json`, `cards.extra.json`). Veja `docs/pokemon-tcgp-data-sources.md`
para a pesquisa completa de fontes disponíveis (inclui outras bases que podem ser
cruzadas no futuro).

## Imagens

As artes de cartas, pacotes e logos de coleção **não** são buscadas em tempo real na
internet — são baixadas uma vez com `npm run download:images` (fontes:
[`PocketDecks/pokemon-tcg-pocket-cards`](https://github.com/PocketDecks/pokemon-tcg-pocket-cards)
para cartas e [`flibustier/pokemon-tcg-pocket-database`](https://github.com/flibustier/pokemon-tcg-pocket-database)
para pacotes/logos) e salvas em `public/images/` (~150MB, fora do git — veja `.gitignore`).
A partir daí a app serve tudo localmente, sem depender de internet em runtime, e as
imagens vão junto na imagem Docker (`Dockerfile` copia `public/` inteiro).

Rode `npm run download:images` depois do `npm run db:seed` (precisa do banco populado
para saber quais cartas/pacotes/coleções existem) e sempre que surgirem coleções novas.
O script é idempotente — pula o que já foi baixado.

## Rodando localmente

1. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Suba o banco (e a app, se quiser rodar tudo em container):
   ```bash
   docker compose up -d db
   ```
3. Aplique o schema no banco:
   ```bash
   npm run db:push
   ```
4. Popule o banco com os dados de cartas/pacotes/coleções:
   ```bash
   npm run db:seed
   ```
5. Baixe as imagens (cartas, pacotes, logos) para servir localmente:
   ```bash
   npm run download:images
   ```
6. Rode a app em modo dev:
   ```bash
   npm run dev
   ```

## Rodando tudo via Docker

```bash
docker compose up -d db
npm run db:push        # roda localmente apontando para localhost:5432 (ver .env)
npm run db:seed
npm run download:images  # precisa rodar ANTES do build: as imagens viram parte da imagem Docker
docker compose up -d --build app
```

Os serviços `app` e `db` no `docker-compose.yml` têm limite de **1 CPU e 512MB de
memória** cada (`mem_limit`/`cpus`, aplicados mesmo fora de modo swarm, mais o bloco
`deploy.resources` equivalente para compatibilidade).

## Scripts

- `npm run dev` — Next.js em modo desenvolvimento
- `npm run build` / `npm run start` — build e start de produção
- `npm run db:push` — sincroniza o schema Prisma com o Postgres (sem migrations versionadas)
- `npm run db:migrate` — cria/aplica migrations versionadas (`prisma migrate dev`)
- `npm run db:seed` — importa coleções, pacotes e cartas da fonte de dados
- `npm run db:generate` — gera o Prisma Client
- `npm run download:images` — baixa as artes de cartas/pacotes/coleções para `public/images/`
