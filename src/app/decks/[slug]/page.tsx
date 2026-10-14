import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckDetail } from "@/lib/queries";
import { formatPercent } from "@/lib/display";
import { CardTile } from "@/components/CardTile";

export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: PageProps<"/decks/[slug]">) {
  const { slug: slugParam } = await params;
  const slug = decodeURIComponent(slugParam);
  const detail = await getDeckDetail(slug);

  if (!detail) notFound();

  const { deck, sufficientCount } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/decks">Baralhos</Link>
        <span>/</span>
        <span>{deck.displayName}</span>
      </nav>

      <h1 className="page-title">{deck.displayName}</h1>
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
