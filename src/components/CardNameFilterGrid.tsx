"use client";

import { useMemo, useState } from "react";
import type { Card } from "@prisma/client";
import { CardTile } from "@/components/CardTile";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

type CardWithPrint = Card & { print: { id: string; ownedQuantity: number } };

export function CardNameFilterGrid({
  cards,
  collectionCode,
  locale,
  t,
}: {
  cards: CardWithPrint[];
  collectionCode: string;
  locale: Locale;
  t: Dictionary["cardFilter"] & { cardTile: Dictionary["cardTile"] };
}) {
  const [nameFilter, setNameFilter] = useState("");

  const visibleCards = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    if (!query) return cards;
    return cards.filter((card) => card.name.toLowerCase().includes(query));
  }, [cards, nameFilter]);

  return (
    <>
      <div className="floating-search">
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.inputAriaLabel}
          className="floating-search-input"
        />
      </div>

      {visibleCards.length === 0 ? (
        <p className="empty-state">{t.emptyState}</p>
      ) : (
        <div className="grid">
          {visibleCards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              collectionCode={collectionCode}
              locale={locale}
              t={t.cardTile}
            />
          ))}
        </div>
      )}
    </>
  );
}
