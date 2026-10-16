import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardDetail } from "@/lib/queries";
import { RARITY_CLASS, getRarityLabel, getTypeLabel, getElementLabel } from "@/lib/display";
import { cardImageUrl } from "@/lib/images";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function CardPage({
  params,
}: PageProps<"/collections/[code]/cards/[number]">) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { code, number } = await params;
  const parsedNumber = Number(number);
  if (Number.isNaN(parsedNumber)) notFound();

  const detail = await getCardDetail(code, parsedNumber, locale);
  if (!detail) notFound();

  const { collection, card, packs, siblingCards } = detail;
  const isPackExclusive = packs.length === 1 && collection._count.packs > 1;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">{t.breadcrumb.collections}</Link>
        <span>/</span>
        <Link href={`/collections/${collection.code}`}>{collection.name}</Link>
        <span>/</span>
        <span>{card.name}</span>
      </nav>

      <div className="card-detail-header">
        <div className="card-detail-image-wrap">
          <Image
            src={cardImageUrl(collection.code, card.number)}
            alt={card.name}
            fill
            sizes="220px"
            className="card-image"
            priority
          />
        </div>
        <div>
          <h1 className="page-title">
            #{card.number} {card.name}
          </h1>
          <span className={`badge ${RARITY_CLASS[card.rarity]}`}>
            {getRarityLabel(card.rarity, locale)}
          </span>
        </div>
      </div>

      <div className="detail-card">
        <dl>
          <div className="detail-row">
            <dt>{t.cardDetailPage.collectionLabel}</dt>
            <dd>{collection.name}</dd>
          </div>
          {card.type && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.typeLabel}</dt>
              <dd>{getTypeLabel(card.type, locale)}</dd>
            </div>
          )}
          {card.element && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.elementLabel}</dt>
              <dd>{getElementLabel(card.element, locale)}</dd>
            </div>
          )}
          {card.stage && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.stageLabel}</dt>
              <dd>{t.cardDetailPage.stageValue(card.stage)}</dd>
            </div>
          )}
          {card.evolvesFrom && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.evolvesFromLabel}</dt>
              <dd>{card.evolvesFrom}</dd>
            </div>
          )}
          {card.health !== null && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.healthLabel}</dt>
              <dd>{card.health}</dd>
            </div>
          )}
          {card.retreatCost !== null && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.retreatCostLabel}</dt>
              <dd>{card.retreatCost}</dd>
            </div>
          )}
          {card.weakness && (
            <div className="detail-row">
              <dt>{t.cardDetailPage.weaknessLabel}</dt>
              <dd>{card.weakness}</dd>
            </div>
          )}
        </dl>
      </div>

      <h2 className="section-title">{t.cardDetailPage.availableInPacks(isPackExclusive)}</h2>
      {packs.length === 0 ? (
        <p className="empty-state">{t.cardDetailPage.noPackEmptyState}</p>
      ) : (
        <div className="pack-links">
          {packs.map((pack) => (
            <Link
              key={pack.id}
              href={`/collections/${collection.code}/packs/${encodeURIComponent(pack.name)}`}
              className="pack-pill"
            >
              {pack.name}
            </Link>
          ))}
        </div>
      )}

      {siblingCards.length > 0 && (
        <>
          <h2 className="section-title">{t.cardDetailPage.alsoAvailableInTitle}</h2>
          <p className="empty-state">{t.cardDetailPage.reprintNote}</p>
          <div className="pack-links">
            {siblingCards.map((sibling) => (
              <Link
                key={sibling.id}
                href={`/collections/${sibling.collection.code}/cards/${sibling.number}`}
                className="pack-pill"
              >
                {sibling.collection.name} (#{sibling.number})
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
