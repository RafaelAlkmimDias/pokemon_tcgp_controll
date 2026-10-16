// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Card } from "@prisma/client";
import { CardNameFilterGrid } from "@/components/CardNameFilterGrid";

vi.mock("@/lib/actions", () => ({
  incrementOwnedQuantity: vi.fn(),
  decrementOwnedQuantity: vi.fn(),
}));

function makeCard(id: string, number: number, name: string): Card & {
  print: { id: string; ownedQuantity: number };
} {
  return {
    id,
    collectionId: "collection-1",
    printId: `print-${id}`,
    number,
    name,
    rarity: "C",
    type: "POKEMON",
    element: "grass",
    stage: "basic",
    health: 60,
    retreatCost: 1,
    weakness: null,
    evolvesFrom: null,
    goodWith: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    print: { id: `print-${id}`, ownedQuantity: 1 },
  };
}

const cards = [
  makeCard("1", 1, "Bulbasaur"),
  makeCard("2", 100, "Tadbulb"),
  makeCard("3", 25, "Charmander"),
];

describe("CardNameFilterGrid", () => {
  it("shows every card when the filter is empty", () => {
    render(<CardNameFilterGrid cards={cards} collectionCode="A1" />);
    expect(screen.getByText("Bulbasaur")).toBeInTheDocument();
    expect(screen.getByText("Tadbulb")).toBeInTheDocument();
    expect(screen.getByText("Charmander")).toBeInTheDocument();
  });

  it("filters live, case-insensitively, by partial name match", () => {
    render(<CardNameFilterGrid cards={cards} collectionCode="A1" />);
    fireEvent.change(screen.getByPlaceholderText("Filtrar por nome..."), {
      target: { value: "bul" },
    });
    expect(screen.getByText("Bulbasaur")).toBeInTheDocument();
    expect(screen.getByText("Tadbulb")).toBeInTheDocument();
    expect(screen.queryByText("Charmander")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    render(<CardNameFilterGrid cards={cards} collectionCode="A1" />);
    fireEvent.change(screen.getByPlaceholderText("Filtrar por nome..."), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("Nenhuma carta encontrada para esse filtro.")).toBeInTheDocument();
  });
});
