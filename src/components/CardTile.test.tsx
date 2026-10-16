// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Card } from "@prisma/client";
import { CardTile } from "@/components/CardTile";

vi.mock("@/lib/actions", () => ({
  incrementOwnedQuantity: vi.fn(),
  decrementOwnedQuantity: vi.fn(),
}));

type CardWithPrint = Card & { print: { id: string; ownedQuantity: number } };

function makeCard(overrides: Partial<CardWithPrint> = {}): CardWithPrint {
  return {
    id: "card-1",
    collectionId: "collection-1",
    printId: "print-1",
    number: 7,
    name: "Bulbasaur",
    rarity: "C",
    type: "POKEMON",
    element: "grass",
    stage: "basic",
    health: 60,
    retreatCost: 1,
    weakness: "fire",
    evolvesFrom: null,
    goodWith: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    print: { id: "print-1", ownedQuantity: 2, ...overrides.print },
  };
}

describe("CardTile", () => {
  it("shows just the owned count when there's no needed quantity", () => {
    render(<CardTile card={makeCard({ print: { id: "print-1", ownedQuantity: 3 } })} collectionCode="A1" />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows owned/needed when neededQuantity is set", () => {
    render(
      <CardTile
        card={makeCard({ print: { id: "print-1", ownedQuantity: 1 } })}
        collectionCode="A1"
        neededQuantity={2}
      />,
    );
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("tints the tile as owned once the owned amount meets the needed quantity", () => {
    const { container } = render(
      <CardTile
        card={makeCard({ print: { id: "print-1", ownedQuantity: 2 } })}
        collectionCode="A1"
        neededQuantity={2}
      />,
    );
    expect(container.querySelector(".card-tile")).toHaveClass("card-tile-owned");
    expect(screen.getByLabelText("Quantidade suficiente")).toBeInTheDocument();
  });

  it("tints the tile as missing when owned is below the needed quantity", () => {
    const { container } = render(
      <CardTile
        card={makeCard({ print: { id: "print-1", ownedQuantity: 1 } })}
        collectionCode="A1"
        neededQuantity={2}
      />,
    );
    expect(container.querySelector(".card-tile")).toHaveClass("card-tile-missing");
    expect(screen.queryByLabelText("Quantidade suficiente")).not.toBeInTheDocument();
  });

  it("prefers availableQuantity over the raw owned count when provided", () => {
    render(
      <CardTile
        card={makeCard({ print: { id: "print-1", ownedQuantity: 5 } })}
        collectionCode="A1"
        neededQuantity={2}
        availableQuantity={1}
      />,
    );
    // Real owned is 5, but availableQuantity (1, e.g. reserved by another
    // built deck) is what should drive the displayed "owned/needed" text.
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("links to the card detail page for its collection", () => {
    render(<CardTile card={makeCard({ number: 42 })} collectionCode="A1" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collections/A1/cards/42");
  });
});
