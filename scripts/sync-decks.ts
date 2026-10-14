import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PROMO_SLUGS } from "@/lib/images";

const BASE_URL =
  "https://raw.githubusercontent.com/PocketDecks/pokemon-tcg-pocket-tier-list/main/public/data";

type RawDeckList = {
  cards: string[];
  score: number;
  strength: number;
};

type RawDeck = {
  name: string;
  lists: RawDeckList[];
  popularity: number;
  expectedWinRate: number;
  powerScore: number;
  metaScore: number;
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// "b2a-034" -> { code: "B2a", number: 34 }. Also handles the richer refs used
// in deck.name, which prefix the card ref with a kebab-case Pokemon name, e.g.
// "mega-altaria-ex-b1-102" (the collection slug is always the second-to-last
// hyphen-separated token, since neither slugs nor zero-padded numbers contain
// hyphens). Promo slugs ("pa"/"pb") map back to our actual collection codes
// via the inverse of PROMO_SLUGS.
function parseCardRef(ref: string, codeByLowerSlug: Map<string, string>) {
  const parts = ref.split("-");
  if (parts.length < 2) return null;
  const number = Number(parts[parts.length - 1]);
  const slug = parts[parts.length - 2];
  const code = codeByLowerSlug.get(slug);
  if (!code || Number.isNaN(number)) return null;
  return { code, number };
}

function bestList(deck: RawDeck): RawDeckList {
  return deck.lists.reduce((best, list) => (list.score > best.score ? list : best));
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("Fetching tournament meta data from PocketDecks/pokemon-tcg-pocket-tier-list...");
  const decks = await fetchJson<RawDeck[]>("best-decks.json");

  const collections = await prisma.collection.findMany();
  const codeByLowerSlug = new Map<string, string>(
    collections.map((collection) => [
      PROMO_SLUGS[collection.code] ?? collection.code.toLowerCase(),
      collection.code,
    ]),
  );
  const cardsByCollectionAndNumber = new Map<string, { id: string; name: string }>();
  const allCards = await prisma.card.findMany({
    select: { id: true, number: true, name: true, collection: { select: { code: true } } },
  });
  for (const card of allCards) {
    cardsByCollectionAndNumber.set(`${card.collection.code}#${card.number}`, {
      id: card.id,
      name: card.name,
    });
  }

  function resolveCard(ref: string) {
    const parsed = parseCardRef(ref, codeByLowerSlug);
    if (!parsed) return null;
    return cardsByCollectionAndNumber.get(`${parsed.code}#${parsed.number}`) ?? null;
  }

  let synced = 0;
  let skippedCards = 0;
  const syncedSlugs = new Set<string>();

  for (const deck of decks) {
    const keyCardNames = deck.name
      .split("&")
      .map((ref) => resolveCard(ref)?.name)
      .filter((name): name is string => Boolean(name));
    const displayName = keyCardNames.length > 0 ? keyCardNames.join(" / ") : deck.name;

    const list = bestList(deck);
    const resolvedCards = list.cards
      .map((entry) => {
        const [quantityStr, ref] = entry.split(":");
        const card = resolveCard(ref);
        if (!card) {
          skippedCards++;
          return null;
        }
        return { cardId: card.id, quantity: Number(quantityStr) };
      })
      .filter((c): c is { cardId: string; quantity: number } => c !== null);

    const savedDeck = await prisma.deck.upsert({
      where: { slug: deck.name },
      create: {
        slug: deck.name,
        displayName,
        popularity: deck.popularity,
        expectedWinRate: deck.expectedWinRate,
        powerScore: deck.powerScore,
        metaScore: deck.metaScore,
      },
      update: {
        displayName,
        popularity: deck.popularity,
        expectedWinRate: deck.expectedWinRate,
        powerScore: deck.powerScore,
        metaScore: deck.metaScore,
      },
    });

    await prisma.deckCard.deleteMany({ where: { deckId: savedDeck.id } });
    if (resolvedCards.length > 0) {
      await prisma.deckCard.createMany({
        data: resolvedCards.map((c) => ({ ...c, deckId: savedDeck.id })),
      });
    }

    syncedSlugs.add(deck.name);
    synced++;
  }

  const { count: removed } = await prisma.deck.deleteMany({
    where: { slug: { notIn: [...syncedSlugs] } },
  });

  console.log(
    `Sincronizados ${synced} baralhos (${removed} removidos por não estarem mais no meta atual).`,
  );
  if (skippedCards > 0) {
    console.log(`Aviso: ${skippedCards} referências de carta não encontradas no banco local.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
