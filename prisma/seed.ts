import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Rarity, CardType } from "@prisma/client";

const BASE_URL =
  "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist";

// Static snapshot, not a live-fetched source - see prisma/data/README.md for
// provenance, coverage, and how to refresh it. Keyed by internal asset ID;
// each entry also carries the source's own English name (`en`), which we
// cross-check against our own (flibustier-sourced) English name before
// trusting `pt` - the source has occasional row-level bugs (e.g. a card's
// `pt` name field pointing at a different, often adjacent, card) that this
// catches even when there's no conflict in the source data itself.
const CARD_NAMES_PT: Record<string, { pt: string; en: string | null }> = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "data", "card-names-pt.json"), "utf-8"),
);

const ASSET_ID_RE = /(PK|TR)_\d+_\d+_\d+/;

function resolveCardNamePt(image: string, englishName: string): string | null {
  const match = image.match(ASSET_ID_RE);
  if (!match) return null;
  const entry = CARD_NAMES_PT[match[0]];
  if (!entry) return null;
  if (entry.en && entry.en !== englishName) return null;
  return entry.pt;
}

// Same provenance/snapshot caveats as CARD_NAMES_PT (see prisma/data/README.md).
// Covers all 24 sets (vs. only 2 in sets.json's own `pt` field), keyed by
// collection code, uppercased for a case-insensitive lookup.
const COLLECTION_NAMES_PT: Record<string, string> = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "data", "collection-names-pt.json"), "utf-8"),
);

function resolveCollectionNamePt(code: string, fallback: string | null): string | null {
  return COLLECTION_NAMES_PT[code.toUpperCase()] ?? fallback;
}

// Same provenance caveats as the other data files - see prisma/data/README.md.
// Only the handful of pack names with a reliably-sourced translation; most
// pack names are Pokémon species names, unchanged between locales.
const PACK_NAMES_PT: Record<string, string> = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "data", "pack-names-pt.json"), "utf-8"),
);

function resolvePackNamePt(name: string): string | null {
  return PACK_NAMES_PT[name] ?? null;
}

type RawSet = {
  code: string;
  releaseDate: string;
  count: number;
  name: Record<string, string>;
  packs: string[];
};

type RawSetsFile = Record<string, RawSet[]>;

type RawCard = {
  set: string;
  number: number;
  rarity: string;
  name: string;
  image: string;
  packs?: string[];
};

type RawCardExtra = RawCard & {
  element?: string;
  type?: string;
  stage?: string | number;
  health?: number;
  retreatCost?: number;
  weakness?: string;
  evolvesFrom?: string;
  goodWith?: string[];
};

const RARITY_MAP: Record<string, Rarity> = {
  C: Rarity.C,
  U: Rarity.U,
  R: Rarity.R,
  RR: Rarity.RR,
  AR: Rarity.AR,
  SR: Rarity.SR,
  SAR: Rarity.SAR,
  IM: Rarity.IM,
  UR: Rarity.UR,
  S: Rarity.S,
  SSR: Rarity.SSR,
};

const TYPE_MAP: Record<string, CardType> = {
  pokemon: CardType.POKEMON,
  supporter: CardType.SUPPORTER,
  item: CardType.ITEM,
  tool: CardType.TOOL,
  fossil: CardType.FOSSIL,
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function cardKey(set: string, number: number) {
  return `${set}#${number}`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("Fetching source data from flibustier/pokemon-tcg-pocket-database...");
  // Sequential, not Promise.all: some sandboxed/CI network setups throttle
  // concurrent outbound connections to the same host and time out otherwise.
  const setsFile = await fetchJson<RawSetsFile>("sets.json");
  const cards = await fetchJson<RawCard[]>("cards.json");
  const cardsExtra = await fetchJson<RawCardExtra[]>("cards.extra.json");

  const extraByKey = new Map<string, RawCardExtra>();
  for (const extra of cardsExtra) {
    extraByKey.set(cardKey(extra.set, extra.number), extra);
  }

  const rawSets = Object.values(setsFile).flat();
  console.log(`Seeding ${rawSets.length} collections...`);

  for (const rawSet of rawSets) {
    const series = rawSet.code.match(/^[A-Z]+/)?.[0] ?? rawSet.code;

    const collection = await prisma.collection.upsert({
      where: { code: rawSet.code },
      create: {
        code: rawSet.code,
        name: rawSet.name.en ?? rawSet.code,
        namePt: resolveCollectionNamePt(rawSet.code, rawSet.name.pt ?? null),
        series,
        releaseDate: new Date(rawSet.releaseDate),
        cardCount: rawSet.count,
      },
      update: {
        name: rawSet.name.en ?? rawSet.code,
        namePt: resolveCollectionNamePt(rawSet.code, rawSet.name.pt ?? null),
        releaseDate: new Date(rawSet.releaseDate),
        cardCount: rawSet.count,
      },
    });

    const packByName = new Map<string, string>();
    for (const packName of rawSet.packs) {
      const pack = await prisma.pack.upsert({
        where: { collectionId_name: { collectionId: collection.id, name: packName } },
        create: { collectionId: collection.id, name: packName, namePt: resolvePackNamePt(packName) },
        update: { namePt: resolvePackNamePt(packName) },
      });
      packByName.set(packName, pack.id);
    }

    const setCards = cards.filter((c) => c.set === rawSet.code);
    for (const card of setCards) {
      const extra = extraByKey.get(cardKey(card.set, card.number));
      const type = extra?.type ? TYPE_MAP[extra.type.toLowerCase()] : undefined;
      const stage =
        extra?.stage === undefined || extra.stage === null ? undefined : String(extra.stage);

      // A print (unique artwork) can be reissued across collections - e.g. Deluxe
      // Pack reprints. Cards sharing the same image share the same print, and
      // therefore the same owned quantity. Never touch ownedQuantity here: it's
      // user state, not source data.
      const print = await prisma.print.upsert({
        where: { imageUrl: card.image },
        create: { imageUrl: card.image },
        update: {},
      });

      const savedCard = await prisma.card.upsert({
        where: { collectionId_number: { collectionId: collection.id, number: card.number } },
        create: {
          collectionId: collection.id,
          printId: print.id,
          number: card.number,
          name: card.name,
          namePt: resolveCardNamePt(card.image, card.name),
          rarity: RARITY_MAP[card.rarity] ?? Rarity.UNKNOWN,
          type,
          element: extra?.element?.toLowerCase(),
          stage,
          health: extra?.health,
          retreatCost: extra?.retreatCost,
          weakness: extra?.weakness,
          evolvesFrom: extra?.evolvesFrom,
          goodWith: extra?.goodWith ?? undefined,
        },
        update: {
          printId: print.id,
          name: card.name,
          namePt: resolveCardNamePt(card.image, card.name),
          rarity: RARITY_MAP[card.rarity] ?? Rarity.UNKNOWN,
          type,
          element: extra?.element?.toLowerCase(),
          stage,
          health: extra?.health,
          retreatCost: extra?.retreatCost,
          weakness: extra?.weakness,
          evolvesFrom: extra?.evolvesFrom,
          goodWith: extra?.goodWith ?? undefined,
        },
      });

      for (const packName of card.packs ?? []) {
        let packId = packByName.get(packName);
        if (!packId) {
          // Defensive fallback: card references a pack not listed on the set itself.
          const pack = await prisma.pack.upsert({
            where: { collectionId_name: { collectionId: collection.id, name: packName } },
            create: { collectionId: collection.id, name: packName, namePt: resolvePackNamePt(packName) },
            update: { namePt: resolvePackNamePt(packName) },
          });
          packId = pack.id;
          packByName.set(packName, packId);
        }

        await prisma.cardPack.upsert({
          where: { cardId_packId: { cardId: savedCard.id, packId } },
          create: { cardId: savedCard.id, packId },
          update: {},
        });
      }
    }

    console.log(`  ${rawSet.code} (${rawSet.name.en}): ${setCards.length} cards, ${rawSet.packs.length} packs`);
  }

  console.log("Seed complete.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
