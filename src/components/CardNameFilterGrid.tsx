"use client";

import { useMemo, useState } from "react";
import type { Card } from "@prisma/client";
import { CardTile } from "@/components/CardTile";

type CardWithPrint = Card & { print: { id: string; ownedQuantity: number } };

export function CardNameFilterGrid({
  cards,
  collectionCode,
}: {
  cards: CardWithPrint[];
  collectionCode: string;
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
          placeholder="Filtrar por nome..."
          aria-label="Filtrar cartas por nome"
          className="floating-search-input"
        />
      </div>

      {visibleCards.length === 0 ? (
        <p className="empty-state">Nenhuma carta encontrada para esse filtro.</p>
      ) : (
        <div className="grid">
          {visibleCards.map((card) => (
            <CardTile key={card.id} card={card} collectionCode={collectionCode} />
          ))}
        </div>
      )}
    </>
  );
}
