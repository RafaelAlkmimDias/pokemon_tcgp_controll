import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckDetail } from "@/lib/queries";
import { formatPercent } from "@/lib/display";
import { CardTile } from "@/components/CardTile";
import { toggleDeckBuilt } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: PageProps<"/decks/[slug]">) {
  const { slug: slugParam } = await params;
  const slug = decodeURIComponent(slugParam);
  const detail = await getDeckDetail(slug);

  if (!detail) notFound();

  const { deck, sufficientCount, totalCopies } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/decks">Baralhos</Link>
        <span>/</span>
        <span>{deck.displayName}</span>
      </nav>

      <div className="deck-detail-heading">
        <h1 className="page-title">{deck.displayName}</h1>
        <form action={toggleDeckBuilt.bind(null, deck.id)}>
          <button
            type="submit"
            className={deck.isBuilt ? "deck-star deck-star-active" : "deck-star"}
            aria-label={deck.isBuilt ? "Desmarcar como montado" : "Marcar como montado"}
            title={deck.isBuilt ? "Montado" : "Marcar como montado"}
          >
            {deck.isBuilt ? "★" : "☆"}
          </button>
        </form>
      </div>
      <p className="page-subtitle">
        {formatPercent(deck.popularity)} do meta · {formatPercent(deck.expectedWinRate)} de
        vitórias esperada
      </p>
      <div className="count-lines count-lines-header">
        <span>
          {sufficientCount}/{deck.cards.length} cartas na quantidade certa
          {sufficientCount === deck.cards.length && (
            <span className="complete-check" aria-label="Baralho completo">
              ✓
            </span>
          )}
        </span>
        <span>{totalCopies} cópias no total</span>
      </div>

      <div className="grid">
        {deck.cards.map((deckCard) => (
          <CardTile
            key={deckCard.cardId}
            card={deckCard.card}
            collectionCode={deckCard.card.collection.code}
            neededQuantity={deckCard.quantity}
          />
        ))}
      </div>
    </main>
  );
}
