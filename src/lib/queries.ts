import { prisma } from "@/lib/prisma";
import { computeCardStats } from "@/lib/cardStats";
import type { Locale } from "@/lib/i18n/locale";

// Collection names are only translated to Portuguese so far (see
// docs/i18n-plan.md, stage 2a) - English is the canonical `name`, with
// `namePt` as an optional override, falling back to `name` when missing.
function resolveCollectionName(
  collection: { name: string; namePt: string | null },
  locale: Locale,
) {
  return locale === "pt" ? (collection.namePt ?? collection.name) : collection.name;
}

// Card names are translated the same way (see docs/i18n-plan.md, stage 2b) -
// `namePt` is a best-effort match against a static snapshot, so it's often
// missing; always falls back to the English `name`.
function resolveCardName(card: { name: string; namePt: string | null }, locale: Locale) {
  return locale === "pt" ? (card.namePt ?? card.name) : card.name;
}

export async function getCollections(locale: Locale) {
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
    name: resolveCollectionName(collection, locale),
    stats: computeCardStats(cardsByCollectionId.get(collection.id) ?? []),
  }));
}

export async function getCollectionDetail(code: string, locale: Locale) {
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
    collection: { ...collection, name: resolveCollectionName(collection, locale), packs },
    stats: computeCardStats(toStatsInput(cards)),
    cardsWithoutPack: cardsWithoutPack.map((card) => ({
      ...card,
      name: resolveCardName(card, locale),
    })),
  };
}

export async function getCollectionCards(code: string, locale: Locale) {
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

  return {
    collection: { ...collection, name: resolveCollectionName(collection, locale) },
    cards: cards.map((card) => ({ ...card, name: resolveCardName(card, locale) })),
    stats,
  };
}

export async function getPackDetail(collectionCode: string, packName: string, locale: Locale) {
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

  return {
    collection: { ...collection, name: resolveCollectionName(collection, locale) },
    pack,
    cards: cards.map((card) => ({ ...card, name: resolveCardName(card, locale) })),
    stats,
  };
}

export async function getCardDetail(collectionCode: string, number: number, locale: Locale) {
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
    collection: { ...collection, name: resolveCollectionName(collection, locale) },
    card: { ...card, name: resolveCardName(card, locale) },
    packs: card.packs.map((cp) => cp.pack),
    siblingCards: card.print.cards
      .filter((sibling) => sibling.id !== card.id)
      .map((sibling) => ({
        ...sibling,
        collection: { ...sibling.collection, name: resolveCollectionName(sibling.collection, locale) },
      })),
  };
}

// The same physical card can't be used in more than one built deck at once,
// so a print already committed to another built deck isn't available here.
function sumQuantityByPrint(deckCards: { quantity: number; card: { printId: string } }[]) {
  const totals = new Map<string, number>();
  for (const deckCard of deckCards) {
    totals.set(deckCard.card.printId, (totals.get(deckCard.card.printId) ?? 0) + deckCard.quantity);
  }
  return totals;
}

function subtractQuantities(totals: Map<string, number>, toSubtract: Map<string, number>) {
  const result = new Map(totals);
  for (const [printId, quantity] of toSubtract) {
    result.set(printId, (result.get(printId) ?? 0) - quantity);
  }
  return result;
}

function availableQuantity(
  deckCard: { card: { printId: string; print: { ownedQuantity: number } } },
  committedByOtherBuiltDecks: Map<string, number>,
) {
  const committed = committedByOtherBuiltDecks.get(deckCard.card.printId) ?? 0;
  return Math.max(0, deckCard.card.print.ownedQuantity - committed);
}

function isDeckCardSufficient(
  deckCard: { quantity: number; card: { printId: string; print: { ownedQuantity: number } } },
  committedByOtherBuiltDecks: Map<string, number>,
) {
  return availableQuantity(deckCard, committedByOtherBuiltDecks) >= deckCard.quantity;
}

export async function getDecks() {
  const decks = await prisma.deck.findMany({
    orderBy: [{ metaScore: "desc" }, { popularity: "desc" }],
    include: {
      cards: {
        include: {
          card: {
            select: { element: true, printId: true, print: { select: { ownedQuantity: true } } },
          },
        },
      },
    },
  });

  const committedByAllBuiltDecks = sumQuantityByPrint(
    decks.filter((deck) => deck.isBuilt).flatMap((deck) => deck.cards),
  );

  return decks.map((deck) => {
    const elements = [
      ...new Set(
        deck.cards
          .map((deckCard) => deckCard.card.element)
          .filter((element): element is string => Boolean(element)),
      ),
    ].sort();

    // Exclude this deck's own commitment from the "committed by others" total,
    // since a built deck shouldn't be penalized for having claimed its own cards.
    const committedByOtherBuiltDecks = deck.isBuilt
      ? subtractQuantities(committedByAllBuiltDecks, sumQuantityByPrint(deck.cards))
      : committedByAllBuiltDecks;

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
      sufficientCount: deck.cards.filter((deckCard) =>
        isDeckCardSufficient(deckCard, committedByOtherBuiltDecks),
      ).length,
    };
  });
}

export async function getDeckDetail(slug: string, locale: Locale) {
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

  const otherBuiltDeckCards = await prisma.deckCard.findMany({
    where: { deck: { isBuilt: true, id: { not: deck.id } } },
    select: { quantity: true, card: { select: { printId: true } } },
  });
  const committedByOtherBuiltDecks = sumQuantityByPrint(otherBuiltDeckCards);

  const cardsWithAvailability = deck.cards.map((deckCard) => ({
    ...deckCard,
    card: { ...deckCard.card, name: resolveCardName(deckCard.card, locale) },
    availableQuantity: availableQuantity(deckCard, committedByOtherBuiltDecks),
  }));

  return {
    deck: { ...deck, cards: cardsWithAvailability },
    sufficientCount: cardsWithAvailability.filter(
      (deckCard) => deckCard.availableQuantity >= deckCard.quantity,
    ).length,
  };
}
