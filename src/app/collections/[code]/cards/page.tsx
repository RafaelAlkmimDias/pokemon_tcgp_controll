import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionCards } from "@/lib/queries";
import { CardNameFilterGrid } from "@/components/CardNameFilterGrid";
import { CardCountLines } from "@/components/CardCountLines";

export const dynamic = "force-dynamic";

export default async function CollectionCardsPage({
  params,
}: PageProps<"/collections/[code]/cards">) {
  const { code } = await params;
  const detail = await getCollectionCards(code);

  if (!detail) notFound();

  const { collection, cards, stats } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">Coleções</Link>
        <span>/</span>
        <Link href={`/collections/${collection.code}`}>{collection.name}</Link>
        <span>/</span>
        <span>Todas as cartas</span>
      </nav>

      <h1 className="page-title">Todas as cartas</h1>
      <p className="page-subtitle">{collection.name}</p>
      <CardCountLines stats={stats} className="count-lines-header" />

      {cards.length === 0 ? (
        <p className="empty-state">Nenhuma carta cadastrada para esta coleção.</p>
      ) : (
        <CardNameFilterGrid cards={cards} collectionCode={collection.code} />
      )}
    </main>
  );
}
