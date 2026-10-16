import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionDetail } from "@/lib/queries";
import { formatDate } from "@/lib/display";
import { CardTile } from "@/components/CardTile";
import { CardCountLines } from "@/components/CardCountLines";
import { collectionLogoUrl, packImageUrl } from "@/lib/images";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[code]">) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { code } = await params;
  const detail = await getCollectionDetail(code, locale);

  if (!detail) notFound();

  const { collection, stats, cardsWithoutPack } = detail;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">{t.breadcrumb.collections}</Link>
        <span>/</span>
        <span>{collection.name}</span>
      </nav>

      <div className="media-header">
        <div className="collection-logo-wrap">
          <Image
            src={collectionLogoUrl(collection.code)}
            alt={collection.name}
            fill
            sizes="240px"
            className="card-image"
            priority
          />
        </div>
        <div>
          <h1 className="page-title">{collection.name}</h1>
          <p className="page-subtitle">
            {collection.code} · {formatDate(collection.releaseDate, locale)}
          </p>
          <CardCountLines stats={stats} className="count-lines-header" t={t.cardCountLines} />
          <Link href={`/collections/${collection.code}/cards`} className="pack-pill">
            {t.collectionPage.viewAllCards}
          </Link>
        </div>
      </div>

      <h2 className="section-title">{t.collectionPage.packsTitle}</h2>
      {collection.packs.length === 0 ? (
        <p className="empty-state">{t.collectionPage.noOwnPacksEmptyState}</p>
      ) : (
        <div className="grid">
          {collection.packs.map((pack) => {
            const packImage = packImageUrl(pack.name);
            return (
              <Link
                key={pack.id}
                href={`/collections/${collection.code}/packs/${encodeURIComponent(pack.name)}`}
                className="tile"
              >
                {packImage && (
                  <div className="pack-tile-image-wrap">
                    <Image
                      src={packImage}
                      alt={t.collectionPage.packAlt(pack.name)}
                      fill
                      sizes="190px"
                      className="card-image"
                    />
                  </div>
                )}
                <div className="tile-title">{pack.name}</div>
                <div className="tile-meta">
                  <CardCountLines stats={pack.stats} t={t.cardCountLines} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {cardsWithoutPack.length > 0 && (
        <>
          <h2 className="section-title">
            {t.collectionPage.cardsWithoutPackTitle(cardsWithoutPack.length)}
          </h2>
          <div className="grid">
            {cardsWithoutPack.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                collectionCode={collection.code}
                locale={locale}
                t={t.cardTile}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
