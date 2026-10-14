import Link from "next/link";
import type { Card } from "@prisma/client";
import { RARITY_CLASS, RARITY_LABEL } from "@/lib/display";

export function CardTile({
  card,
  collectionCode,
}: {
  card: Card;
  collectionCode: string;
}) {
  return (
    <Link
      href={`/collections/${collectionCode}/cards/${card.number}`}
      className="tile card-tile"
    >
      <span className="card-number">#{card.number}</span>
      <span className="tile-title">{card.name}</span>
      <span className={`badge ${RARITY_CLASS[card.rarity]}`}>
        {RARITY_LABEL[card.rarity]}
      </span>
    </Link>
  );
}
