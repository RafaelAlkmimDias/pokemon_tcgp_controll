import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionDetail } from "@/lib/queries";
import { formatDate } from "@/lib/display";
import { CardTile } from "@/components/CardTile";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[code]">) {
  const { code } = await params;
  const detail = await getCollectionDetail(code);

  if (!detail) notFound();

  const { collection, cardsWithoutPack } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">Coleções</Link>
        <span>/</span>
        <span>{collection.name}</span>
      </nav>

      <h1 className="page-title">{collection.name}</h1>
      <p className="page-subtitle">
        {collection.code} · {formatDate(collection.releaseDate)} ·{" "}
        {collection._count.cards} cartas no total
      </p>

      <h2 className="section-title">Pacotes</h2>
      {collection.packs.length === 0 ? (
        <p className="empty-state">Esta coleção não tem pacotes próprios.</p>
      ) : (
        <div className="grid">
          {collection.packs.map((pack) => (
            <Link
              key={pack.id}
              href={`/collections/${collection.code}/packs/${encodeURIComponent(pack.name)}`}
              className="tile"
            >
              <div className="tile-title">{pack.name}</div>
              <div className="tile-meta">
                <span>{pack._count.cards} cartas</span>
                <span>{pack.ownedCount} diferentes que você tem</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {cardsWithoutPack.length > 0 && (
        <>
          <h2 className="section-title">
            Cartas sem pacote específico ({cardsWithoutPack.length})
          </h2>
          <div className="grid">
            {cardsWithoutPack.map((card) => (
              <CardTile key={card.id} card={card} collectionCode={collection.code} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
