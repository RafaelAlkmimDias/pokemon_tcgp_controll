import Link from "next/link";
import { getCollections } from "@/lib/queries";
import { formatDate } from "@/lib/display";
import { CardCountLines } from "@/components/CardCountLines";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const collections = await getCollections(locale);

  const bySeries = new Map<string, typeof collections>();
  for (const collection of collections) {
    const group = bySeries.get(collection.series) ?? [];
    group.push(collection);
    bySeries.set(collection.series, group);
  }

  return (
    <main className="container">
      <h1 className="page-title">{t.home.title}</h1>
      <p className="page-subtitle">{t.home.subtitle}</p>

      {[...bySeries.entries()].map(([series, items]) => (
        <section key={series} className="series-group">
          <h2 className="section-title">{t.home.series(series)}</h2>
          <div className="grid">
            {items.map((collection) => (
              <Link
                key={collection.code}
                href={`/collections/${collection.code}`}
                className="tile"
              >
                <div className="tile-title">{collection.name}</div>
                <div className="tile-meta">
                  <span>{collection.code}</span>
                  <span>{formatDate(collection.releaseDate, locale)}</span>
                  <span>{t.home.packsCount(collection._count.packs)}</span>
                  <CardCountLines stats={collection.stats} t={t.cardCountLines} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
