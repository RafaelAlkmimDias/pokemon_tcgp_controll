import Image from "next/image";
import Link from "next/link";
import type { Card } from "@prisma/client";
import { RARITY_CLASS, RARITY_LABEL } from "@/lib/display";
import { cardImageUrl } from "@/lib/images";
import { decrementOwnedQuantity, incrementOwnedQuantity } from "@/lib/actions";

type CardWithPrint = Card & { print: { id: string; ownedQuantity: number } };

export function CardTile({
  card,
  collectionCode,
}: {
  card: CardWithPrint;
  collectionCode: string;
}) {
  const owned = card.print.ownedQuantity > 0;

  return (
    <div className={`tile card-tile ${owned ? "card-tile-owned" : ""}`}>
      <Link
        href={`/collections/${collectionCode}/cards/${card.number}`}
        className="card-tile-link"
      >
        <div className="card-image-wrap">
          <Image
            src={cardImageUrl(collectionCode, card.number)}
            alt={card.name}
            fill
            sizes="190px"
            className="card-image"
          />
        </div>
        <span className="card-number">#{card.number}</span>
        <span className="tile-title">{card.name}</span>
        <span className={`badge ${RARITY_CLASS[card.rarity]}`}>
          {RARITY_LABEL[card.rarity]}
        </span>
      </Link>

      <div className="qty-controls">
        <form action={decrementOwnedQuantity.bind(null, card.print.id)}>
          <button
            type="submit"
            className="qty-btn"
            aria-label={`Diminuir quantidade de ${card.name}`}
          >
            −
          </button>
        </form>
        <span className="qty-count">{card.print.ownedQuantity}</span>
        <form action={incrementOwnedQuantity.bind(null, card.print.id)}>
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
