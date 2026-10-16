import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckDetail } from "@/lib/queries";
import { formatPercent } from "@/lib/display";
import { CardTile } from "@/components/CardTile";
import { toggleDeckBuilt } from "@/lib/actions";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: PageProps<"/decks/[slug]">) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { slug: slugParam } = await params;
  const slug = decodeURIComponent(slugParam);
  const detail = await getDeckDetail(slug, locale);

  if (!detail) notFound();

  const { deck, sufficientCount } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/decks">{t.layout.decksLink}</Link>
        <span>/</span>
        <span>{deck.displayName}</span>
      </nav>

      <div className="deck-detail-heading">
        <h1 className="page-title">{deck.displayName}</h1>
        <form action={toggleDeckBuilt.bind(null, deck.id)}>
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
      <p className="page-subtitle">
        {formatPercent(deck.popularity)} {t.deckDetailPage.metaShareSuffix} ·{" "}
        {formatPercent(deck.expectedWinRate)} {t.deckDetailPage.expectedWinRateSuffix}
      </p>
      <div className="count-lines count-lines-header">
        <span>
          {sufficientCount}/{deck.cards.length} {t.deckDetailPage.sufficientCardsLabel}
          {sufficientCount === deck.cards.length && (
            <span className="complete-check" aria-label={t.deckDetailPage.completeAriaLabel}>
              ✓
            </span>
          )}
        </span>
      </div>

      <div className="grid">
        {deck.cards.map((deckCard) => (
          <CardTile
            key={deckCard.cardId}
            card={deckCard.card}
            collectionCode={deckCard.card.collection.code}
            neededQuantity={deckCard.quantity}
            availableQuantity={deckCard.availableQuantity}
            locale={locale}
            t={t.cardTile}
          />
        ))}
      </div>
    </main>
  );
}
