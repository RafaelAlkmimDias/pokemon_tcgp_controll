import type { CardType, Rarity } from "@prisma/client";
import { testPrisma } from "@/test/testPrisma";

let printCounter = 0;

export function createCollection(overrides: {
  code: string;
  name?: string;
  namePt?: string | null;
  series?: string;
  releaseDate?: Date;
}) {
  return testPrisma.collection.create({
    data: {
      code: overrides.code,
      name: overrides.name ?? overrides.code,
      namePt: overrides.namePt,
      series: overrides.series ?? overrides.code[0],
      releaseDate: overrides.releaseDate,
    },
  });
}

export function createPrint(overrides: { ownedQuantity?: number; imageUrl?: string } = {}) {
  printCounter += 1;
  return testPrisma.print.create({
    data: {
      imageUrl: overrides.imageUrl ?? `https://example.test/print-${printCounter}.webp`,
      ownedQuantity: overrides.ownedQuantity ?? 0,
    },
  });
}

export function createCard(overrides: {
  collectionId: string;
  printId: string;
  number: number;
  name?: string;
  namePt?: string | null;
  rarity?: Rarity;
  type?: CardType;
  element?: string;
}) {
  return testPrisma.card.create({
    data: {
      collectionId: overrides.collectionId,
      printId: overrides.printId,
      number: overrides.number,
      name: overrides.name ?? `Card ${overrides.number}`,
      namePt: overrides.namePt,
      rarity: overrides.rarity ?? "C",
      type: overrides.type,
      element: overrides.element,
    },
  });
}

export function createPack(overrides: { collectionId: string; name: string }) {
  return testPrisma.pack.create({
    data: { collectionId: overrides.collectionId, name: overrides.name },
  });
}

export function createDeck(overrides: {
  slug: string;
  displayName?: string;
  popularity?: number;
  expectedWinRate?: number;
  metaScore?: number | null;
  isBuilt?: boolean;
}) {
  return testPrisma.deck.create({
    data: {
      slug: overrides.slug,
      displayName: overrides.displayName ?? overrides.slug,
      popularity: overrides.popularity ?? 0.1,
      expectedWinRate: overrides.expectedWinRate ?? 0.5,
      metaScore: overrides.metaScore ?? 10,
      isBuilt: overrides.isBuilt ?? false,
    },
  });
}

export function createDeckCard(overrides: { deckId: string; cardId: string; quantity: number }) {
  return testPrisma.deckCard.create({
    data: {
      deckId: overrides.deckId,
      cardId: overrides.cardId,
      quantity: overrides.quantity,
    },
  });
}

/** Creates a Collection + Print + Card in one go, the common case for fixtures. */
export async function createCardWithPrint(overrides: {
  collectionId: string;
  number: number;
  name?: string;
  namePt?: string | null;
  rarity?: Rarity;
  ownedQuantity?: number;
}) {
  const print = await createPrint({ ownedQuantity: overrides.ownedQuantity });
  const card = await createCard({
    collectionId: overrides.collectionId,
    printId: print.id,
    number: overrides.number,
    name: overrides.name,
    namePt: overrides.namePt,
    rarity: overrides.rarity,
  });
  return { card, print };
}
