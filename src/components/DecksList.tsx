"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ELEMENT_LABEL, capitalize, formatPercent } from "@/lib/display";
import { toggleDeckBuilt } from "@/lib/actions";

type DeckSummary = {
  id: string;
  slug: string;
  displayName: string;
  popularity: number;
  expectedWinRate: number;
  metaScore: number | null;
  isBuilt: boolean;
  elements: string[];
  totalCards: number;
  sufficientCount: number;
};

type SortKey = "metaScore" | "popularity" | "expectedWinRate" | "sufficientCount";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "metaScore", label: "Relevância no meta" },
  { key: "popularity", label: "% do meta" },
  { key: "expectedWinRate", label: "% de vitórias esperadas" },
  { key: "sufficientCount", label: "Cartas na quantidade certa" },
];

function sortValue(deck: DeckSummary, key: SortKey): number {
  const value = deck[key];
  // Nulls (decks without enough data for a score) always sort last.
  return value === null ? -Infinity : value;
}

export function DecksList({ decks }: { decks: DeckSummary[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("metaScore");

  const availableElements = useMemo(
    () => [...new Set(decks.flatMap((deck) => deck.elements))].sort(),
    [decks],
  );

  const visibleDecks = useMemo(() => {
    const filtered = filter ? decks.filter((deck) => deck.elements.includes(filter)) : decks;
    return [...filtered].sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey));
  }, [decks, filter, sortKey]);

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

      <label className="sort-control">
        Ordenar por
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {visibleDecks.length === 0 ? (
        <p className="empty-state">Nenhum baralho desse tipo no meta atual.</p>
      ) : (
        <div className="grid">
          {visibleDecks.map((deck) => (
            <div
              key={deck.slug}
              className={deck.isBuilt ? "tile deck-tile deck-tile-built" : "tile deck-tile"}
            >
              <Link href={`/decks/${encodeURIComponent(deck.slug)}`} className="deck-tile-link">
                <div className="tile-title">{deck.displayName}</div>
                <div className="tile-meta">
                  <span>{formatPercent(deck.popularity)} do meta</span>
                  <span>{formatPercent(deck.expectedWinRate)} de vitórias esperada</span>
                  <span>
                    {deck.sufficientCount}/{deck.totalCards} cartas na quantidade certa
                  </span>
                </div>
              </Link>
              <form action={toggleDeckBuilt.bind(null, deck.id)}>
                <button type="submit" className="deck-built-toggle">
                  {deck.isBuilt ? "✓ Montado" : "Marcar como montado"}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
