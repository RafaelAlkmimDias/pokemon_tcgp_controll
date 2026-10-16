import Image from "next/image";
import Link from "next/link";
import type { Card } from "@prisma/client";
import { RARITY_CLASS, getRarityLabel } from "@/lib/display";
import { cardImageUrl } from "@/lib/images";
import { decrementOwnedQuantity, incrementOwnedQuantity } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

type CardWithPrint = Card & { print: { id: string; ownedQuantity: number } };

export function CardTile({
  card,
  collectionCode,
  neededQuantity,
  availableQuantity,
  locale,
  t,
}: {
  card: CardWithPrint;
  collectionCode: string;
  /** When set, shows "possui/precisa" instead of just the owned count, and
   * tints the tile green only once the owned amount meets this quantity. */
  neededQuantity?: number;
  /** Overrides the owned count used for display/tinting, e.g. to exclude
   * copies already committed to other built decks. Defaults to the raw
   * owned quantity. */
  availableQuantity?: number;
  locale: Locale;
  t: Dictionary["cardTile"];
}) {
  const owned = availableQuantity ?? card.print.ownedQuantity;
  const hasEnough = neededQuantity === undefined ? owned > 0 : owned >= neededQuantity;

  let toneClass = "";
  if (neededQuantity !== undefined) {
    toneClass = hasEnough ? "card-tile-owned" : "card-tile-missing";
  } else if (hasEnough) {
    toneClass = "card-tile-owned";
  }

  return (
    <div className={`tile card-tile ${toneClass}`}>
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
          {getRarityLabel(card.rarity, locale)}
        </span>
      </Link>

      <div className="qty-controls">
        <form action={decrementOwnedQuantity.bind(null, card.print.id)}>
          <button
            type="submit"
            className="qty-btn"
            aria-label={`${t.decreaseLabelPrefix} ${card.name}`}
          >
            −
          </button>
        </form>
        <span className="qty-count">
          {neededQuantity !== undefined ? `${owned}/${neededQuantity}` : owned}
          {neededQuantity !== undefined && hasEnough && (
            <span className="complete-check" aria-label={t.sufficientAriaLabel}>
              ✓
            </span>
          )}
        </span>
        <form action={incrementOwnedQuantity.bind(null, card.print.id)}>
          <button
            type="submit"
            className="qty-btn"
            aria-label={`${t.increaseLabelPrefix} ${card.name}`}
          >
            +
          </button>
        </form>
      </div>
    </div>
  );
}
