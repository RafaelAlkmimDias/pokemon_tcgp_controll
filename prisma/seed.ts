import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Rarity, CardType } from "@prisma/client";

const BASE_URL =
  "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist";

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
  const [setsFile, cards, cardsExtra] = await Promise.all([
    fetchJson<RawSetsFile>("sets.json"),
    fetchJson<RawCard[]>("cards.json"),
    fetchJson<RawCardExtra[]>("cards.extra.json"),
  ]);

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
        series,
        releaseDate: new Date(rawSet.releaseDate),
        cardCount: rawSet.count,
      },
      update: {
        name: rawSet.name.en ?? rawSet.code,
        releaseDate: new Date(rawSet.releaseDate),
        cardCount: rawSet.count,
      },
    });

    const packByName = new Map<string, string>();
    for (const packName of rawSet.packs) {
      const pack = await prisma.pack.upsert({
        where: { collectionId_name: { collectionId: collection.id, name: packName } },
        create: { collectionId: collection.id, name: packName },
        update: {},
      });
      packByName.set(packName, pack.id);
    }

    const setCards = cards.filter((c) => c.set === rawSet.code);
    for (const card of setCards) {
      const extra = extraByKey.get(cardKey(card.set, card.number));
      const type = extra?.type ? TYPE_MAP[extra.type.toLowerCase()] : undefined;
      const stage =
        extra?.stage === undefined || extra.stage === null ? undefined : String(extra.stage);

      const savedCard = await prisma.card.upsert({
        where: { collectionId_number: { collectionId: collection.id, number: card.number } },
        create: {
          collectionId: collection.id,
          number: card.number,
          name: card.name,
          rarity: RARITY_MAP[card.rarity] ?? Rarity.UNKNOWN,
          imageUrl: card.image,
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
          name: card.name,
          rarity: RARITY_MAP[card.rarity] ?? Rarity.UNKNOWN,
          imageUrl: card.image,
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
            create: { collectionId: collection.id, name: packName },
            update: {},
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
