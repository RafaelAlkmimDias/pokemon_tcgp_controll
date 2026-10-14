import Link from "next/link";
import { getDecks } from "@/lib/queries";
import { formatPercent } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const decks = await getDecks();

  return (
    <main className="container">
      <h1 className="page-title">Baralhos competitivos</h1>
      <p className="page-subtitle">
        Arquétipos do meta atual, baseados em resultados de torneios (Limitless TCG via
        PocketDecks).
      </p>

      {decks.length === 0 ? (
        <p className="empty-state">
          Nenhum baralho importado ainda. Rode <code>npm run sync:decks</code>.
        </p>
      ) : (
        <div className="grid">
          {decks.map((deck) => (
            <Link
              key={deck.slug}
              href={`/decks/${encodeURIComponent(deck.slug)}`}
              className="tile"
            >
              <div className="tile-title">{deck.displayName}</div>
              <div className="tile-meta">
                <span>{formatPercent(deck.popularity)} do meta</span>
                <span>{formatPercent(deck.expectedWinRate)} de vitórias esperada</span>
                <span>
                  {deck.sufficientCount}/{deck.totalCards} cartas na quantidade certa
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
