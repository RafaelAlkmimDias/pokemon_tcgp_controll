"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ELEMENT_LABEL, capitalize, formatPercent } from "@/lib/display";

type DeckSummary = {
  slug: string;
  displayName: string;
  popularity: number;
  expectedWinRate: number;
  elements: string[];
  totalCards: number;
  sufficientCount: number;
};

export function DecksList({ decks }: { decks: DeckSummary[] }) {
  const [filter, setFilter] = useState<string | null>(null);

  const availableElements = useMemo(
    () => [...new Set(decks.flatMap((deck) => deck.elements))].sort(),
    [decks],
  );

  const filteredDecks = filter ? decks.filter((deck) => deck.elements.includes(filter)) : decks;

  return (
    <>
      <div className="filter-chips">
        <button
          type="button"
          className={filter === null ? "chip chip-active" : "chip"}
          onClick={() => setFilter(null)}
        >
          Todos
        </button>
        {availableElements.map((element) => (
          <button
            key={element}
            type="button"
            className={filter === element ? "chip chip-active" : "chip"}
            onClick={() => setFilter(element === filter ? null : element)}
          >
            {ELEMENT_LABEL[element] ?? capitalize(element)}
          </button>
        ))}
      </div>

      {filteredDecks.length === 0 ? (
        <p className="empty-state">Nenhum baralho desse tipo no meta atual.</p>
      ) : (
        <div className="grid">
          {filteredDecks.map((deck) => (
            <Link
              key={deck.slug}
              href={`/decks/${encodeURIComponent(deck.slug)}`}
              className="tile"
            >
              <div className="tile-title">{deck.displayName}</div>
              <div className="tile-meta">
                <span>{formatPercent(deck.popularity)} do meta</span>
                <span>{formatPercent(deck.expectedWinRate)} de vitórias esperada</span>
                <span>
                  {deck.sufficientCount}/{deck.totalCards} cartas na quantidade certa
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
