import { prisma } from "@/lib/prisma";

export async function getCollections() {
  return prisma.collection.findMany({
    orderBy: { releaseDate: "asc" },
    include: {
      _count: { select: { packs: true, cards: true } },
    },
  });
}

export async function getCollectionDetail(code: string) {
  const collection = await prisma.collection.findUnique({
    where: { code },
    include: {
      packs: {
        orderBy: { name: "asc" },
        include: { _count: { select: { cards: true } } },
      },
      _count: { select: { cards: true } },
    },
  });
  if (!collection) return null;

  const ownedCountByPack = await prisma.cardPack.groupBy({
    by: ["packId"],
    where: {
      pack: { collectionId: collection.id },
      card: { ownedQuantity: { gt: 0 } },
    },
    _count: { _all: true },
  });
  const ownedByPackId = new Map(ownedCountByPack.map((row) => [row.packId, row._count._all]));

  const packs = collection.packs.map((pack) => ({
    ...pack,
    ownedCount: ownedByPackId.get(pack.id) ?? 0,
  }));

  const cardsWithoutPack = await prisma.card.findMany({
    where: { collectionId: collection.id, packs: { none: {} } },
    orderBy: { number: "asc" },
  });

  return { collection: { ...collection, packs }, cardsWithoutPack };
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

  return {
    collection,
    pack,
    cards: pack.cards.map((cp) => cp.card),
  };
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
