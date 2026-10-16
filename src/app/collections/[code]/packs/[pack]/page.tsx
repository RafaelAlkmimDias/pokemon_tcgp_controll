import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackDetail } from "@/lib/queries";
import { CardNameFilterGrid } from "@/components/CardNameFilterGrid";
import { CardCountLines } from "@/components/CardCountLines";
import { packImageUrl } from "@/lib/images";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function PackPage({
  params,
}: PageProps<"/collections/[code]/packs/[pack]">) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { code, pack: packParam } = await params;
  const packName = decodeURIComponent(packParam);
  const detail = await getPackDetail(code, packName);

  if (!detail) notFound();

  const { collection, pack, cards, stats } = detail;
  const packImage = packImageUrl(pack.name);

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">{t.breadcrumb.collections}</Link>
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
              alt={t.packPage.packAlt(pack.name)}
              fill
              sizes="160px"
              className="card-image"
              priority
            />
          </div>
        )}
        <div>
          <h1 className="page-title">{t.packPage.title(pack.name)}</h1>
          <p className="page-subtitle">{collection.name}</p>
          <CardCountLines stats={stats} className="count-lines-header" t={t.cardCountLines} />
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="empty-state">{t.packPage.emptyState}</p>
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
