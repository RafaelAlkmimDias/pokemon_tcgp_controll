import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardDetail } from "@/lib/queries";
import { RARITY_CLASS, RARITY_LABEL, TYPE_LABEL, capitalize } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function CardPage({
  params,
}: PageProps<"/collections/[code]/cards/[number]">) {
  const { code, number } = await params;
  const parsedNumber = Number(number);
  if (Number.isNaN(parsedNumber)) notFound();

  const detail = await getCardDetail(code, parsedNumber);
  if (!detail) notFound();

  const { collection, card, packs } = detail;
  const isPackExclusive = packs.length === 1 && collection._count.packs > 1;

  return (
    <main className="container">
      <nav className="breadcrumb">
        <Link href="/">Coleções</Link>
        <span>/</span>
        <Link href={`/collections/${collection.code}`}>{collection.name}</Link>
        <span>/</span>
        <span>{card.name}</span>
      </nav>

      <h1 className="page-title">
        #{card.number} {card.name}
      </h1>
      <span className={`badge ${RARITY_CLASS[card.rarity]}`}>
        {RARITY_LABEL[card.rarity]}
      </span>

      <div className="detail-card" style={{ marginTop: "1.5rem" }}>
        <dl>
          <div className="detail-row">
            <dt>Coleção</dt>
            <dd>{collection.name}</dd>
          </div>
          {card.type && (
            <div className="detail-row">
              <dt>Tipo</dt>
              <dd>{TYPE_LABEL[card.type]}</dd>
            </div>
          )}
          {card.element && (
            <div className="detail-row">
              <dt>Elemento</dt>
              <dd>{capitalize(card.element)}</dd>
            </div>
          )}
          {card.stage && (
            <div className="detail-row">
              <dt>Estágio</dt>
              <dd>{card.stage === "basic" ? "Básico" : `Estágio ${card.stage}`}</dd>
            </div>
          )}
          {card.evolvesFrom && (
            <div className="detail-row">
              <dt>Evolui de</dt>
              <dd>{card.evolvesFrom}</dd>
            </div>
          )}
          {card.health !== null && (
            <div className="detail-row">
              <dt>Pontos de Vida</dt>
              <dd>{card.health}</dd>
            </div>
          )}
          {card.retreatCost !== null && (
            <div className="detail-row">
              <dt>Custo de Recuo</dt>
              <dd>{card.retreatCost}</dd>
            </div>
          )}
          {card.weakness && (
            <div className="detail-row">
              <dt>Fraqueza</dt>
              <dd>{card.weakness}</dd>
            </div>
          )}
        </dl>
      </div>

      <h2 className="section-title">
        Disponível {isPackExclusive ? "exclusivamente " : ""}no(s) pacote(s)
      </h2>
      {packs.length === 0 ? (
        <p className="empty-state">
          Esta carta não é obtida por um pacote específico (ex: recompensa ou promo).
        </p>
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
    </main>
  );
}
