import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestDatabase, testPrisma } from "@/test/testPrisma";
import { createDeck, createPrint } from "@/test/fixtures";

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("@/test/testPrisma");
  return { prisma: testPrisma };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { decrementOwnedQuantity, incrementOwnedQuantity, toggleDeckBuilt } = await import(
  "@/lib/actions"
);

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("incrementOwnedQuantity / decrementOwnedQuantity", () => {
  it("increments the print's owned quantity", async () => {
    const print = await createPrint({ ownedQuantity: 1 });

    await incrementOwnedQuantity(print.id);

    const updated = await testPrisma.print.findUniqueOrThrow({ where: { id: print.id } });
    expect(updated.ownedQuantity).toBe(2);
  });

  it("decrements the print's owned quantity", async () => {
    const print = await createPrint({ ownedQuantity: 2 });

    await decrementOwnedQuantity(print.id);

    const updated = await testPrisma.print.findUniqueOrThrow({ where: { id: print.id } });
    expect(updated.ownedQuantity).toBe(1);
  });

  it("never decrements owned quantity below zero", async () => {
    const print = await createPrint({ ownedQuantity: 0 });

    await decrementOwnedQuantity(print.id);

    const updated = await testPrisma.print.findUniqueOrThrow({ where: { id: print.id } });
    expect(updated.ownedQuantity).toBe(0);
  });
});

describe("toggleDeckBuilt", () => {
  it("flips isBuilt from false to true and back", async () => {
    const deck = await createDeck({ slug: "deck-a", isBuilt: false });

    await toggleDeckBuilt(deck.id);
    expect((await testPrisma.deck.findUniqueOrThrow({ where: { id: deck.id } })).isBuilt).toBe(
      true,
    );

    await toggleDeckBuilt(deck.id);
    expect((await testPrisma.deck.findUniqueOrThrow({ where: { id: deck.id } })).isBuilt).toBe(
      false,
    );
  });
});
