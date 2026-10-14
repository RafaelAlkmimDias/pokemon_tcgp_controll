import { getDecks } from "@/lib/queries";
import { DecksList } from "@/components/DecksList";

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
        <DecksList decks={decks} />
      )}
    </main>
  );
}
