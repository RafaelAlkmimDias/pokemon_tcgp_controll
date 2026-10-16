// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DecksList } from "@/components/DecksList";
import { dictionaries } from "@/lib/i18n/dictionaries";

vi.mock("@/lib/actions", () => ({
  toggleDeckBuilt: vi.fn(),
}));

const t = { ...dictionaries.pt.decksList, deckStar: dictionaries.pt.deckStar };

const decks = [
  {
    id: "1",
    slug: "deck-a",
    displayName: "Deck A",
    popularity: 0.1,
    expectedWinRate: 0.5,
    metaScore: 10,
    isBuilt: false,
    elements: ["fire"],
    totalCards: 14,
    sufficientCount: 13,
  },
  {
    id: "2",
    slug: "deck-b",
    displayName: "Deck B",
    popularity: 0.2,
    expectedWinRate: 0.6,
    metaScore: 30,
    isBuilt: true,
    elements: ["water", "psychic"],
    totalCards: 13,
    sufficientCount: 13,
  },
  {
    id: "3",
    slug: "deck-c",
    displayName: "Deck C",
    popularity: 0.3,
    expectedWinRate: 0.4,
    metaScore: null,
    isBuilt: false,
    elements: ["fire"],
    totalCards: 15,
    sufficientCount: 14,
  },
];

describe("DecksList", () => {
  it("sorts by meta relevance by default, nulls last", () => {
    render(<DecksList decks={decks} locale="pt" t={t} />);
    const titles = screen.getAllByText(/Deck [A-C]/).map((el) => el.textContent);
    expect(titles).toEqual(["Deck B", "Deck A", "Deck C"]);
  });

  it("filters by element chip", () => {
    render(<DecksList decks={decks} locale="pt" t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "Água" }));
    expect(screen.getByText("Deck B")).toBeInTheDocument();
    expect(screen.queryByText("Deck A")).not.toBeInTheDocument();
    expect(screen.queryByText("Deck C")).not.toBeInTheDocument();
  });

  it("clicking the active chip again clears the filter", () => {
    render(<DecksList decks={decks} locale="pt" t={t} />);
    const chip = screen.getByRole("button", { name: "Água" });
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(screen.getByText("Deck A")).toBeInTheDocument();
    expect(screen.getByText("Deck C")).toBeInTheDocument();
  });

  it("sorts by sufficient-cards ratio, not raw count, when that option is picked", () => {
    render(<DecksList decks={decks} locale="pt" t={t} />);
    fireEvent.change(screen.getByLabelText(/Ordenar por/), {
      target: { value: "sufficientCount" },
    });
    const titles = screen.getAllByText(/Deck [A-C]/).map((el) => el.textContent);
    // Deck A: 13/14 (~0.93), Deck B: 13/13 (1.0), Deck C: 14/15 (~0.93 but lower than A)
    expect(titles[0]).toBe("Deck B");
  });

  it("shows an empty state when there are no decks to list", () => {
    render(<DecksList decks={[]} locale="pt" t={t} />);
    expect(screen.getByText("Nenhum baralho desse tipo no meta atual.")).toBeInTheDocument();
  });
});
