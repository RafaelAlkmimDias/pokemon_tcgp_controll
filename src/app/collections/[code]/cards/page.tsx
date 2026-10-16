import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionCards } from "@/lib/queries";
import { CardNameFilterGrid } from "@/components/CardNameFilterGrid";
import { CardCountLines } from "@/components/CardCountLines";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function CollectionCardsPage({
  params,
}: PageProps<"/collections/[code]/cards">) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { code } = await params;
  const detail = await getCollectionCards(code, locale);

  if (!detail) notFound();

  const { collection, cards, stats } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">{t.breadcrumb.collections}</Link>
        <span>/</span>
        <Link href={`/collections/${collection.code}`}>{collection.name}</Link>
        <span>/</span>
        <span>{t.collectionCardsPage.title}</span>
      </nav>

      <h1 className="page-title">{t.collectionCardsPage.title}</h1>
      <p className="page-subtitle">{collection.name}</p>
      <CardCountLines stats={stats} className="count-lines-header" t={t.cardCountLines} />

      {cards.length === 0 ? (
        <p className="empty-state">{t.collectionCardsPage.emptyState}</p>
      ) : (
        <CardNameFilterGrid
          cards={cards}
          collectionCode={collection.code}
          locale={locale}
          t={{ ...t.cardFilter, cardTile: t.cardTile }}
        />
      )}
    </main>
  );
}
