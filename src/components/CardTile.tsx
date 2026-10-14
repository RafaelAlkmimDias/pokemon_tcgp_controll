import Link from "next/link";
import type { Card } from "@prisma/client";
import { RARITY_CLASS, RARITY_LABEL } from "@/lib/display";
import { decrementOwnedQuantity, incrementOwnedQuantity } from "@/lib/actions";

export function CardTile({
  card,
  collectionCode,
}: {
  card: Card;
  collectionCode: string;
}) {
  const owned = card.ownedQuantity > 0;

  return (
    <div className={`tile card-tile ${owned ? "card-tile-owned" : ""}`}>
      <Link
        href={`/collections/${collectionCode}/cards/${card.number}`}
        className="card-tile-link"
      >
        <span className="card-number">#{card.number}</span>
        <span className="tile-title">{card.name}</span>
        <span className={`badge ${RARITY_CLASS[card.rarity]}`}>
          {RARITY_LABEL[card.rarity]}
        </span>
      </Link>

      <div className="qty-controls">
        <form action={decrementOwnedQuantity.bind(null, card.id)}>
          <button
            type="submit"
            className="qty-btn"
            aria-label={`Diminuir quantidade de ${card.name}`}
          >
            −
          </button>
        </form>
        <span className="qty-count">{card.ownedQuantity}</span>
        <form action={incrementOwnedQuantity.bind(null, card.id)}>
          <button
            type="submit"
            className="qty-btn"
            aria-label={`Aumentar quantidade de ${card.name}`}
          >
            +
          </button>
        </form>
      </div>
    </div>
  );
}
