import { config } from "dotenv";

config({ path: ".env.test" });

import { resetTestDatabase, testPrisma } from "../src/test/testPrisma";
import {
  createCardWithPrint,
  createCollection,
  createDeck,
  createDeckCard,
  createPack,
} from "../src/test/fixtures";

// Seeds a small, deterministic dataset into the isolated test database
// before the E2E suite runs. Split into independent card/deck pairs per
// scenario so specs can't interfere with each other regardless of run order.
export default async function globalSetup() {
  await resetTestDatabase();

  const collection = await createCollection({
    code: "E2E1",
    name: "E2E Set",
    namePt: "Conjunto E2E",
    releaseDate: new Date("2026-01-01"),
  });
  const pack = await createPack({ collectionId: collection.id, name: "Test Pack" });

  // Used by the name-filter and owned-quantity specs.
  const { card: bulbasaur } = await createCardWithPrint({
    collectionId: collection.id,
    number: 1,
    name: "Bulbasaur",
    ownedQuantity: 2,
  });
  await testPrisma.cardPack.create({ data: { cardId: bulbasaur.id, packId: pack.id } });

  const { card: charmander } = await createCardWithPrint({
    collectionId: collection.id,
    number: 2,
    name: "Charmander",
    namePt: "Charmander PT",
    ownedQuantity: 0,
  });
  await testPrisma.cardPack.create({ data: { cardId: charmander.id, packId: pack.id } });

  // Used by the decks list sort/filter spec - deliberately not built, and on
  // a print not shared with the "built deck" spec below.
  const sortDeckA = await createDeck({
    slug: "e2e-sort-deck-a",
    displayName: "E2E Sort Deck A",
    metaScore: 50,
  });
  const { card: sortCardA } = await createCardWithPrint({
    collectionId: collection.id,
    number: 3,
    name: "Pidgey",
    ownedQuantity: 1,
  });
  await createDeckCard({ deckId: sortDeckA.id, cardId: sortCardA.id, quantity: 1 });

  const sortDeckB = await createDeck({
    slug: "e2e-sort-deck-b",
    displayName: "E2E Sort Deck B",
    metaScore: 20,
  });
  const { card: sortCardB } = await createCardWithPrint({
    collectionId: collection.id,
    number: 4,
    name: "Rattata",
    ownedQuantity: 0,
  });
  await createDeckCard({ deckId: sortDeckB.id, cardId: sortCardB.id, quantity: 1 });

  // Used by the "marking a deck built reserves its cards" spec - its own
  // dedicated print, isolated from everything above.
  const { card: squirtle } = await createCardWithPrint({
    collectionId: collection.id,
    number: 5,
    name: "Squirtle",
    ownedQuantity: 2,
  });

  const builtDeck = await createDeck({
    slug: "e2e-built-deck",
    displayName: "E2E Built Deck",
    metaScore: 10,
  });
  await createDeckCard({ deckId: builtDeck.id, cardId: squirtle.id, quantity: 2 });

  const otherDeck = await createDeck({
    slug: "e2e-other-deck",
    displayName: "E2E Other Deck",
    metaScore: 5,
  });
  await createDeckCard({ deckId: otherDeck.id, cardId: squirtle.id, quantity: 1 });

  await testPrisma.$disconnect();
}
