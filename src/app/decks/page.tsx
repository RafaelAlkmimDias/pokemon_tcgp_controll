import { getDecks } from "@/lib/queries";
import { DecksList } from "@/components/DecksList";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const decks = await getDecks();

  return (
    <main className="container">
      <h1 className="page-title">{t.decksPage.title}</h1>
      <p className="page-subtitle">{t.decksPage.subtitle}</p>

      {decks.length === 0 ? (
        <p className="empty-state">
          {t.decksPage.emptyStatePrefix}
          <code>npm run sync:decks</code>
          {t.decksPage.emptyStateSuffix}
        </p>
      ) : (
        <DecksList decks={decks} locale={locale} t={{ ...t.decksList, deckStar: t.deckStar }} />
      )}
    </main>
  );
}
