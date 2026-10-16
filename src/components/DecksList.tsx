"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getElementLabel, formatPercent } from "@/lib/display";
import { toggleDeckBuilt } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

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

function sortValue(deck: DeckSummary, key: SortKey): number {
  if (key === "sufficientCount") {
    // Compare completion ratio, not raw count, so e.g. 13/13 outranks 14/15.
    return deck.totalCards === 0 ? 0 : deck.sufficientCount / deck.totalCards;
  }
  const value = deck[key];
  // Nulls (decks without enough data for a score) always sort last.
  return value === null ? -Infinity : value;
}

type DecksListDictionary = Dictionary["decksList"] & { deckStar: Dictionary["deckStar"] };

export function DecksList({
  decks,
  locale,
  t,
}: {
  decks: DeckSummary[];
  locale: Locale;
  t: DecksListDictionary;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("metaScore");

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "metaScore", label: t.sortMetaScore },
    { key: "popularity", label: t.sortPopularity },
    { key: "expectedWinRate", label: t.sortExpectedWinRate },
    { key: "sufficientCount", label: t.sortSufficientCount },
  ];

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
          {t.all}
        </button>
        {availableElements.map((element) => (
          <button
            key={element}
            type="button"
            className={filter === element ? "chip chip-active" : "chip"}
            onClick={() => setFilter(element === filter ? null : element)}
          >
            {getElementLabel(element, locale)}
          </button>
        ))}
      </div>

      <label className="sort-control">
        {t.sortBy}
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          {sortOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {visibleDecks.length === 0 ? (
        <p className="empty-state">{t.emptyState}</p>
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
                  <span>
                    {formatPercent(deck.popularity)} {t.metaShareSuffix}
                  </span>
                  <span>
                    {formatPercent(deck.expectedWinRate)} {t.expectedWinRateSuffix}
                  </span>
                  <span>
                    {deck.sufficientCount}/{deck.totalCards} {t.sufficientCardsLabel}
                  </span>
                </div>
              </Link>
              <form action={toggleDeckBuilt.bind(null, deck.id)} className="deck-star-form">
                <button
                  type="submit"
                  className={deck.isBuilt ? "deck-star deck-star-active" : "deck-star"}
                  aria-label={deck.isBuilt ? t.deckStar.unmark : t.deckStar.mark}
                  title={deck.isBuilt ? t.deckStar.built : t.deckStar.mark}
                >
                  {deck.isBuilt ? "★" : "☆"}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
