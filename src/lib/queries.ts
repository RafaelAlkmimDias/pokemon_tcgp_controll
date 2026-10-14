import { prisma } from "@/lib/prisma";
import { computeCardStats } from "@/lib/cardStats";

export async function getCollections() {
  const collections = await prisma.collection.findMany({
    orderBy: { releaseDate: "asc" },
    include: { _count: { select: { packs: true } } },
  });

  const cards = await prisma.card.findMany({
    select: { collectionId: true, rarity: true, ownedQuantity: true },
  });

  const cardsByCollectionId = new Map<string, typeof cards>();
  for (const card of cards) {
    const list = cardsByCollectionId.get(card.collectionId) ?? [];
    list.push(card);
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
    include: { packs: { select: { packId: true } } },
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

  const packs = collection.packs.map((pack) => ({
    ...pack,
    stats: computeCardStats(cardsByPackId.get(pack.id) ?? []),
  }));

  return {
    collection: { ...collection, packs },
    stats: computeCardStats(cards),
    cardsWithoutPack,
  };
}

export async function getCollectionCards(code: string) {
  const collection = await prisma.collection.findUnique({ where: { code } });
  if (!collection) return null;

  const cards = await prisma.card.findMany({
    where: { collectionId: collection.id },
    orderBy: { number: "asc" },
  });

  return { collection, cards, stats: computeCardStats(cards) };
}

export async function getPackDetail(collectionCode: string, packName: string) {
  const collection = await prisma.collection.findUnique({ where: { code: collectionCode } });
  if (!collection) return null;

  const pack = await prisma.pack.findUnique({
    where: { collectionId_name: { collectionId: collection.id, name: packName } },
    include: {
      cards: { include: { card: true }, orderBy: { card: { number: "asc" } } },
    },
  });
  if (!pack) return null;

  const cards = pack.cards.map((cp) => cp.card);

  return { collection, pack, cards, stats: computeCardStats(cards) };
}

export async function getCardDetail(collectionCode: string, number: number) {
  const collection = await prisma.collection.findUnique({
    where: { code: collectionCode },
    include: { _count: { select: { packs: true } } },
  });
  if (!collection) return null;

  const card = await prisma.card.findUnique({
    where: { collectionId_number: { collectionId: collection.id, number } },
    include: { packs: { include: { pack: true }, orderBy: { pack: { name: "asc" } } } },
  });
  if (!card) return null;

  return {
    collection,
    card,
    packs: card.packs.map((cp) => cp.pack),
  };
}
