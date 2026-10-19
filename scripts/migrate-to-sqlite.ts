// One-off migration: copies the real data from the Postgres database (the
// Next.js app's source of truth today, including real `ownedQuantity`s and
// `isBuilt` flags) into the SQLite file used by the Rust rewrite in
// `pokemon-tcgp/`. See docs/rust-migration-plan.md and
// docs/rust-migration-checklist.md (block 4) for context.
//
// Read-only against Postgres - never writes back to it. Writes only to the
// target SQLite file.
//
// Prerequisite: the target SQLite file must already have the schema applied
// (run `cd pokemon-tcgp && cargo run` once, which runs the migrations on
// boot, then stop it - this script doesn't create the schema itself, to
// avoid duplicating `pokemon-tcgp/migrations/0001_init.sql`).
//
// Usage:
//   npm run migrate:sqlite                 # refuses if the target already has data
//   npm run migrate:sqlite -- --force      # wipes the target's tables first
//   npm run migrate:sqlite -- --target path/to/other.db

import "dotenv/config";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DEFAULT_TARGET = path.join(process.cwd(), "pokemon-tcgp", "data", "pokemon_tcgp.db");

function parseArgs(argv: string[]) {
  const force = argv.includes("--force");
  const targetIndex = argv.indexOf("--target");
  const target = targetIndex !== -1 ? argv[targetIndex + 1] : DEFAULT_TARGET;
  return { force, target };
}

// node:sqlite rejects `undefined`, raw `boolean`, and raw `Date` as bind
// parameters - normalize whatever Prisma gives us into what it accepts.
function bind(value: unknown): string | number | bigint | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number | bigint;
}

function assertSchemaExists(db: DatabaseSync) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'collections'")
    .get();
  if (!row) {
    throw new Error(
      "A tabela 'collections' não existe no banco SQLite de destino. Rode " +
        "`cd pokemon-tcgp && cargo run` uma vez (cria o schema via migrations), " +
        "pare o processo, e rode este script de novo.",
    );
  }
}

function existingRowCount(db: DatabaseSync): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM collections").get() as
    | { count: number }
    | undefined;
  return row?.count ?? 0;
}

// Order matters: children before parents, so FK constraints never block a
// delete (some FKs here are RESTRICT, not CASCADE - see migrations/0001_init.sql).
const TABLES_IN_DELETE_ORDER = [
  "deck_cards",
  "decks",
  "card_packs",
  "cards",
  "packs",
  "prints",
  "collections",
];

function wipe(db: DatabaseSync) {
  for (const table of TABLES_IN_DELETE_ORDER) {
    db.exec(`DELETE FROM ${table}`);
  }
}

async function main() {
  const { force, target } = parseArgs(process.argv.slice(2));

  const db = new DatabaseSync(target);
  db.exec("PRAGMA foreign_keys = ON");
  assertSchemaExists(db);

  const existing = existingRowCount(db);
  if (existing > 0 && !force) {
    db.close();
    throw new Error(
      `O banco SQLite de destino (${target}) já tem ${existing} coleção(ões). ` +
        "Rode de novo com --force para apagar e reimportar, ou apague o arquivo " +
        "manualmente se preferir começar do zero.",
    );
  }
  if (existing > 0 && force) {
    console.log(`Apagando ${existing} coleção(ões) existentes em ${target}...`);
    wipe(db);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("Lendo dados do Postgres...");
  const [collections, packs, prints, cards, cardPacks, decks, deckCards] = await Promise.all([
    prisma.collection.findMany(),
    prisma.pack.findMany(),
    prisma.print.findMany(),
    prisma.card.findMany(),
    prisma.cardPack.findMany(),
    prisma.deck.findMany(),
    prisma.deckCard.findMany(),
  ]);

  // Postgres ids are cuids (strings); SQLite ids are INTEGER AUTOINCREMENT
  // (see docs/rust-migration-plan.md's "IDs trocados" decision) - every
  // insert below records old id -> new id so the next table's foreign keys
  // can be remapped.
  const collectionIdMap = new Map<string, number>();
  const packIdMap = new Map<string, number>();
  const printIdMap = new Map<string, number>();
  const cardIdMap = new Map<string, number>();
  const deckIdMap = new Map<string, number>();

  const insertCollection = db.prepare(
    `INSERT INTO collections (code, name, name_pt, series, release_date, card_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of collections) {
    const { lastInsertRowid } = insertCollection.run(
      bind(c.code),
      bind(c.name),
      bind(c.namePt),
      bind(c.series),
      bind(c.releaseDate),
      bind(c.cardCount),
      bind(c.createdAt),
      bind(c.updatedAt),
    );
    collectionIdMap.set(c.id, Number(lastInsertRowid));
  }

  const insertPrint = db.prepare(
    `INSERT INTO prints (image_url, owned_quantity, created_at, updated_at) VALUES (?, ?, ?, ?)`,
  );
  for (const p of prints) {
    const { lastInsertRowid } = insertPrint.run(
      bind(p.imageUrl),
      bind(p.ownedQuantity),
      bind(p.createdAt),
      bind(p.updatedAt),
    );
    printIdMap.set(p.id, Number(lastInsertRowid));
  }

  const insertPack = db.prepare(
    `INSERT INTO packs (name, name_pt, collection_id, image_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const p of packs) {
    const collectionId = collectionIdMap.get(p.collectionId);
    if (collectionId === undefined) throw new Error(`Pack ${p.id}: coleção ${p.collectionId} não migrada`);
    const { lastInsertRowid } = insertPack.run(
      bind(p.name),
      bind(p.namePt),
      bind(collectionId),
      bind(p.imageUrl),
      bind(p.createdAt),
      bind(p.updatedAt),
    );
    packIdMap.set(p.id, Number(lastInsertRowid));
  }

  const insertCard = db.prepare(
    `INSERT INTO cards (collection_id, print_id, number, name, name_pt, rarity, type, element, stage,
                         health, retreat_cost, weakness, evolves_from, good_with, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of cards) {
    const collectionId = collectionIdMap.get(c.collectionId);
    const printId = printIdMap.get(c.printId);
    if (collectionId === undefined) throw new Error(`Card ${c.id}: coleção ${c.collectionId} não migrada`);
    if (printId === undefined) throw new Error(`Card ${c.id}: print ${c.printId} não migrado`);
    const { lastInsertRowid } = insertCard.run(
      bind(collectionId),
      bind(printId),
      bind(c.number),
      bind(c.name),
      bind(c.namePt),
      bind(c.rarity),
      bind(c.type),
      bind(c.element),
      bind(c.stage),
      bind(c.health),
      bind(c.retreatCost),
      bind(c.weakness),
      bind(c.evolvesFrom),
      bind(c.goodWith),
      bind(c.createdAt),
      bind(c.updatedAt),
    );
    cardIdMap.set(c.id, Number(lastInsertRowid));
  }

  const insertCardPack = db.prepare(`INSERT INTO card_packs (card_id, pack_id) VALUES (?, ?)`);
  let skippedCardPacks = 0;
  for (const cp of cardPacks) {
    const cardId = cardIdMap.get(cp.cardId);
    const packId = packIdMap.get(cp.packId);
    if (cardId === undefined || packId === undefined) {
      skippedCardPacks++;
      continue;
    }
    insertCardPack.run(bind(cardId), bind(packId));
  }

  const insertDeck = db.prepare(
    `INSERT INTO decks (slug, display_name, popularity, expected_win_rate, power_score, meta_score,
                         is_built, synced_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const d of decks) {
    const { lastInsertRowid } = insertDeck.run(
      bind(d.slug),
      bind(d.displayName),
      bind(d.popularity),
      bind(d.expectedWinRate),
      bind(d.powerScore),
      bind(d.metaScore),
      bind(d.isBuilt),
      bind(d.syncedAt),
      bind(d.updatedAt),
    );
    deckIdMap.set(d.id, Number(lastInsertRowid));
  }

  const insertDeckCard = db.prepare(
    `INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES (?, ?, ?)`,
  );
  let skippedDeckCards = 0;
  for (const dc of deckCards) {
    const deckId = deckIdMap.get(dc.deckId);
    const cardId = cardIdMap.get(dc.cardId);
    if (deckId === undefined || cardId === undefined) {
      skippedDeckCards++;
      continue;
    }
    insertDeckCard.run(bind(deckId), bind(cardId), bind(dc.quantity));
  }

  db.close();
  await prisma.$disconnect();

  console.log(`Migrado para ${target}:`);
  console.log(`  collections: ${collectionIdMap.size}`);
  console.log(`  packs:       ${packIdMap.size}`);
  console.log(`  prints:      ${printIdMap.size}`);
  console.log(`  cards:       ${cardIdMap.size}`);
  console.log(`  card_packs:  ${cardPacks.length - skippedCardPacks}`);
  console.log(`  decks:       ${deckIdMap.size}`);
  console.log(`  deck_cards:  ${deckCards.length - skippedDeckCards}`);
  if (skippedCardPacks > 0 || skippedDeckCards > 0) {
    console.log(
      `Aviso: ${skippedCardPacks} card_packs e ${skippedDeckCards} deck_cards pulados ` +
        "(referenciavam uma linha que não foi migrada).",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
