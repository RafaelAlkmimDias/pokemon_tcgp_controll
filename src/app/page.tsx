import Link from "next/link";
import { getCollections } from "@/lib/queries";
import { formatDate } from "@/lib/display";
import { CardCountLines } from "@/components/CardCountLines";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const collections = await getCollections();

  const bySeries = new Map<string, typeof collections>();
  for (const collection of collections) {
    const group = bySeries.get(collection.series) ?? [];
    group.push(collection);
    bySeries.set(collection.series, group);
  }

  return (
    <main className="container">
      <h1 className="page-title">Coleções</h1>
      <p className="page-subtitle">
        Escolha uma coleção para ver seus pacotes e as cartas disponíveis em cada um.
      </p>

      {[...bySeries.entries()].map(([series, items]) => (
        <section key={series} className="series-group">
          <h2 className="section-title">Série {series}</h2>
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
                  <span>{formatDate(collection.releaseDate)}</span>
                  <span>{collection._count.packs} pacote(s)</span>
                  <CardCountLines stats={collection.stats} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
