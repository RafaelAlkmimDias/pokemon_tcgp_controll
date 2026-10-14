import { prisma } from "@/lib/prisma";
import { computeCardStats } from "@/lib/cardStats";

export async function getCollections() {
  const collections = await prisma.collection.findMany({
    orderBy: { releaseDate: "desc" },
    include: { _count: { select: { packs: true } } },
  });

  const cards = await prisma.card.findMany({
    select: { collectionId: true, rarity: true, print: { select: { ownedQuantity: true } } },
  });

  const cardsByCollectionId = new Map<string, { rarity: (typeof cards)[number]["rarity"]; ownedQuantity: number }[]>();
  for (const card of cards) {
    const list = cardsByCollectionId.get(card.collectionId) ?? [];
    list.push({ rarity: card.rarity, ownedQuantity: card.print.ownedQuantity });
    cardsByCollectionId.set(card.collectionId, list);
  }

  return collections.map((collection) => ({
    ...collection,
    stats: computeCardStats(cardsByCollectionId.get(collection.id) ?? []),
  }));
}

export async function getCollectionDetail(code: string) {
  const collection = await prisma.collection.findUnique({
    where: { code },
    include: { packs: { orderBy: { name: "asc" } } },
  });
  if (!collection) return null;

  const cards = await prisma.card.findMany({
    where: { collectionId: collection.id },
    include: {
      packs: { select: { packId: true } },
      print: { select: { id: true, ownedQuantity: true } },
    },
    orderBy: { number: "asc" },
  });

  const cardsByPackId = new Map<string, typeof cards>();
  const cardsWithoutPack: typeof cards = [];
  for (const card of cards) {
    if (card.packs.length === 0) cardsWithoutPack.push(card);
    for (const { packId } of card.packs) {
      const list = cardsByPackId.get(packId) ?? [];
      list.push(card);
      cardsByPackId.set(packId, list);
    }
  }

  const toStatsInput = (list: typeof cards) =>
    list.map((card) => ({ rarity: card.rarity, ownedQuantity: card.print.ownedQuantity }));

  const packs = collection.packs.map((pack) => ({
    ...pack,
    stats: computeCardStats(toStatsInput(cardsByPackId.get(pack.id) ?? [])),
  }));

  return {
    collection: { ...collection, packs },
    stats: computeCardStats(toStatsInput(cards)),
    cardsWithoutPack,
  };
}

export async function getCollectionCards(code: string) {
  const collection = await prisma.collection.findUnique({ where: { code } });
  if (!collection) return null;

  const cards = await prisma.card.findMany({
    where: { collectionId: collection.id },
    include: { print: { select: { id: true, ownedQuantity: true } } },
    orderBy: { number: "asc" },
  });

  const stats = computeCardStats(
    cards.map((card) => ({ rarity: card.rarity, ownedQuantity: card.print.ownedQuantity })),
  );

  return { collection, cards, stats };
}

export async function getPackDetail(collectionCode: string, packName: string) {
  const collection = await prisma.collection.findUnique({ where: { code: collectionCode } });
  if (!collection) return null;

  const pack = await prisma.pack.findUnique({
    where: { collectionId_name: { collectionId: collection.id, name: packName } },
    include: {
      cards: {
        include: { card: { include: { print: { select: { id: true, ownedQuantity: true } } } } },
        orderBy: { card: { number: "asc" } },
      },
    },
  });
  if (!pack) return null;

  const cards = pack.cards.map((cp) => cp.card);
  const stats = computeCardStats(
    cards.map((card) => ({ rarity: card.rarity, ownedQuantity: card.print.ownedQuantity })),
  );

  return { collection, pack, cards, stats };
}

export async function getCardDetail(collectionCode: string, number: number) {
  const collection = await prisma.collection.findUnique({
    where: { code: collectionCode },
    include: { _count: { select: { packs: true } } },
  });
  if (!collection) return null;

  const card = await prisma.card.findUnique({
    where: { collectionId_number: { collectionId: collection.id, number } },
    include: {
      packs: { include: { pack: true }, orderBy: { pack: { name: "asc" } } },
      print: {
        include: {
          cards: {
            include: { collection: true },
            orderBy: { collection: { releaseDate: "asc" } },
          },
        },
      },
    },
  });
  if (!card) return null;

  return {
    collection,
    card,
    packs: card.packs.map((cp) => cp.pack),
    siblingCards: card.print.cards.filter((sibling) => sibling.id !== card.id),
  };
}

function isDeckCardSufficient(deckCard: { quantity: number; card: { print: { ownedQuantity: number } } }) {
  return deckCard.card.print.ownedQuantity >= deckCard.quantity;
}

export async function getDecks() {
  const decks = await prisma.deck.findMany({
    orderBy: [{ metaScore: "desc" }, { popularity: "desc" }],
    include: {
      cards: {
        include: {
          card: { select: { element: true, print: { select: { ownedQuantity: true } } } },
        },
      },
    },
  });

  return decks.map((deck) => {
    const elements = [
      ...new Set(
        deck.cards
          .map((deckCard) => deckCard.card.element)
          .filter((element): element is string => Boolean(element)),
      ),
    ].sort();

    return {
      id: deck.id,
      slug: deck.slug,
      displayName: deck.displayName,
      popularity: deck.popularity,
      expectedWinRate: deck.expectedWinRate,
      powerScore: deck.powerScore,
      metaScore: deck.metaScore,
      isBuilt: deck.isBuilt,
      elements,
      totalCards: deck.cards.length,
      sufficientCount: deck.cards.filter(isDeckCardSufficient).length,
    };
  });
}

export async function getDeckDetail(slug: string) {
  const deck = await prisma.deck.findUnique({
    where: { slug },
    include: {
      cards: {
        include: {
          card: {
            include: {
              collection: true,
              print: { select: { id: true, ownedQuantity: true } },
            },
          },
        },
        orderBy: [{ quantity: "desc" }, { card: { name: "asc" } }],
      },
    },
  });
  if (!deck) return null;

  return {
    deck,
    sufficientCount: deck.cards.filter(isDeckCardSufficient).length,
  };
}
