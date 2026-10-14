import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackDetail } from "@/lib/queries";
import { CardTile } from "@/components/CardTile";
import { packImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function PackPage({
  params,
}: PageProps<"/collections/[code]/packs/[pack]">) {
  const { code, pack: packParam } = await params;
  const packName = decodeURIComponent(packParam);
  const detail = await getPackDetail(code, packName);

  if (!detail) notFound();

  const { collection, pack, cards, ownedCount } = detail;
  const packImage = packImageUrl(pack.name);

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">Coleções</Link>
        <span>/</span>
        <Link href={`/collections/${collection.code}`}>{collection.name}</Link>
        <span>/</span>
        <span>{pack.name}</span>
      </nav>

      <div className="media-header">
        {packImage && (
          <div className="pack-detail-image-wrap">
            <Image
              src={packImage}
              alt={`Pacote ${pack.name}`}
              fill
              sizes="160px"
              className="card-image"
              priority
            />
          </div>
        )}
        <div>
          <h1 className="page-title">Pacote {pack.name}</h1>
          <p className="page-subtitle">
            {collection.name} · {cards.length} cartas neste pacote · {ownedCount} diferentes
            que você tem
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="empty-state">Nenhuma carta cadastrada para este pacote.</p>
      ) : (
        <div className="grid">
          {cards.map((card) => (
            <CardTile key={card.id} card={card} collectionCode={collection.code} />
          ))}
        </div>
      )}
    </main>
  );
}
