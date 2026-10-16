import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestDatabase, testPrisma } from "@/test/testPrisma";
import {
  createCard,
  createCardWithPrint,
  createCollection,
  createDeck,
  createDeckCard,
  createPack,
  createPrint,
} from "@/test/fixtures";

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("@/test/testPrisma");
  return { prisma: testPrisma };
});

const {
  getCardDetail,
  getCollectionCards,
  getCollectionDetail,
  getCollections,
  getDeckDetail,
  getDecks,
  getPackDetail,
} = await import("@/lib/queries");

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("getCollections", () => {
  it("returns collections ordered by release date, newest first, with stats", async () => {
    const older = await createCollection({ code: "OLD", releaseDate: new Date("2024-01-01") });
    const newer = await createCollection({ code: "NEW", releaseDate: new Date("2025-01-01") });
    await createCardWithPrint({ collectionId: older.id, number: 1, ownedQuantity: 1 });
    await createCardWithPrint({ collectionId: newer.id, number: 1, ownedQuantity: 0 });

    const collections = await getCollections();

    expect(collections.map((c) => c.code)).toEqual(["NEW", "OLD"]);
    expect(collections.find((c) => c.code === "OLD")?.stats.allOwned).toBe(1);
    expect(collections.find((c) => c.code === "NEW")?.stats.allOwned).toBe(0);
  });
});

describe("getCollectionDetail", () => {
  it("groups card stats by pack and lists cards without a pack separately", async () => {
    const collection = await createCollection({ code: "A1" });
    const pack = await createPack({ collectionId: collection.id, name: "Mewtwo" });

    const { card: inPack } = await createCardWithPrint({
      collectionId: collection.id,
      number: 1,
      ownedQuantity: 1,
    });
    await testPrisma.cardPack.create({ data: { cardId: inPack.id, packId: pack.id } });

    await createCardWithPrint({ collectionId: collection.id, number: 2, ownedQuantity: 0 });

    const detail = await getCollectionDetail("A1");

    expect(detail?.collection.packs).toHaveLength(1);
    expect(detail?.collection.packs[0].stats.allTotal).toBe(1);
    expect(detail?.stats.allTotal).toBe(2);
    expect(detail?.cardsWithoutPack).toHaveLength(1);
    expect(detail?.cardsWithoutPack[0].number).toBe(2);
  });

  it("returns null for an unknown collection code", async () => {
    expect(await getCollectionDetail("DOES-NOT-EXIST")).toBeNull();
  });
});

describe("getCollectionCards", () => {
  it("returns cards ordered by number with aggregate stats", async () => {
    const collection = await createCollection({ code: "A1" });
    await createCardWithPrint({ collectionId: collection.id, number: 2, ownedQuantity: 1 });
    await createCardWithPrint({ collectionId: collection.id, number: 1, ownedQuantity: 0 });

    const detail = await getCollectionCards("A1");

    expect(detail?.cards.map((c) => c.number)).toEqual([1, 2]);
    expect(detail?.stats.allTotal).toBe(2);
    expect(detail?.stats.allOwned).toBe(1);
  });
});

describe("getPackDetail", () => {
  it("returns only the cards belonging to that pack", async () => {
    const collection = await createCollection({ code: "A1" });
    const pack = await createPack({ collectionId: collection.id, name: "Mewtwo" });
    const otherPack = await createPack({ collectionId: collection.id, name: "Charizard" });

    const { card: inPack } = await createCardWithPrint({ collectionId: collection.id, number: 1 });
    await testPrisma.cardPack.create({ data: { cardId: inPack.id, packId: pack.id } });

    const { card: inOtherPack } = await createCardWithPrint({
      collectionId: collection.id,
      number: 2,
    });
    await testPrisma.cardPack.create({ data: { cardId: inOtherPack.id, packId: otherPack.id } });

    const detail = await getPackDetail("A1", "Mewtwo");

    expect(detail?.cards.map((c) => c.number)).toEqual([1]);
  });
});

describe("getCardDetail", () => {
  it("lists sibling cards that share the same print across collections", async () => {
    const collectionA = await createCollection({ code: "A1" });
    const collectionB = await createCollection({ code: "A1a" });
    const print = await createPrint({ ownedQuantity: 1 });

    const card = await createCard({ collectionId: collectionA.id, printId: print.id, number: 1 });
    const reprint = await createCard({
      collectionId: collectionB.id,
      printId: print.id,
      number: 5,
    });

    const detail = await getCardDetail("A1", 1);

    expect(detail?.card.id).toBe(card.id);
    expect(detail?.siblingCards.map((c) => c.id)).toEqual([reprint.id]);
  });
});

describe("getDecks / getDeckDetail - card availability across built decks", () => {
  it("a built deck's commitment reduces what's available for other decks sharing the print", async () => {
    const collection = await createCollection({ code: "A1" });
    const { card, print } = await createCardWithPrint({
      collectionId: collection.id,
      number: 1,
      ownedQuantity: 2,
    });

    const builtDeck = await createDeck({ slug: "built-deck", isBuilt: true });
    await createDeckCard({ deckId: builtDeck.id, cardId: card.id, quantity: 2 });

    const otherDeck = await createDeck({ slug: "other-deck", isBuilt: false });
    await createDeckCard({ deckId: otherDeck.id, cardId: card.id, quantity: 1 });

    const decks = await getDecks();
    const builtSummary = decks.find((d) => d.slug === "built-deck");
    const otherSummary = decks.find((d) => d.slug === "other-deck");

    // The built deck isn't penalized for having claimed its own 2 copies.
    expect(builtSummary?.sufficientCount).toBe(1);
    expect(builtSummary?.totalCards).toBe(1);
    // The other deck has nothing left: both owned copies are committed elsewhere.
    expect(otherSummary?.sufficientCount).toBe(0);
    expect(otherSummary?.totalCards).toBe(1);

    const otherDetail = await getDeckDetail("other-deck");
    expect(otherDetail?.sufficientCount).toBe(0);
    expect(otherDetail?.deck.cards[0].availableQuantity).toBe(0);

    const builtDetail = await getDeckDetail("built-deck");
    expect(builtDetail?.sufficientCount).toBe(1);
    expect(builtDetail?.deck.cards[0].availableQuantity).toBe(print.ownedQuantity);
  });

  it("sufficientCount is unaffected when no deck is built", async () => {
    const collection = await createCollection({ code: "A1" });
    const { card } = await createCardWithPrint({
      collectionId: collection.id,
      number: 1,
      ownedQuantity: 1,
    });

    const deckA = await createDeck({ slug: "deck-a" });
    await createDeckCard({ deckId: deckA.id, cardId: card.id, quantity: 1 });
    const deckB = await createDeck({ slug: "deck-b" });
    await createDeckCard({ deckId: deckB.id, cardId: card.id, quantity: 1 });

    const decks = await getDecks();
    expect(decks.find((d) => d.slug === "deck-a")?.sufficientCount).toBe(1);
    expect(decks.find((d) => d.slug === "deck-b")?.sufficientCount).toBe(1);
  });

  it("collects the distinct, sorted set of elements used across a deck's cards", async () => {
    const collection = await createCollection({ code: "A1" });
    const { card: fireCard } = await createCardWithPrint({ collectionId: collection.id, number: 1 });
    await testPrisma.card.update({ where: { id: fireCard.id }, data: { element: "fire" } });
    const { card: waterCard } = await createCardWithPrint({ collectionId: collection.id, number: 2 });
    await testPrisma.card.update({ where: { id: waterCard.id }, data: { element: "water" } });

    const deck = await createDeck({ slug: "deck-a" });
    await createDeckCard({ deckId: deck.id, cardId: fireCard.id, quantity: 1 });
    await createDeckCard({ deckId: deck.id, cardId: waterCard.id, quantity: 1 });

    const decks = await getDecks();
    expect(decks.find((d) => d.slug === "deck-a")?.elements).toEqual(["fire", "water"]);
  });

  it("getDeckDetail returns null for an unknown slug", async () => {
    expect(await getDeckDetail("does-not-exist")).toBeNull();
  });
});
