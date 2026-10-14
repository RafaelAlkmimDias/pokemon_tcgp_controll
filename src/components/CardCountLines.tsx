import type { CardStats } from "@/lib/cardStats";

export function CardCountLines({
  stats,
  className,
}: {
  stats: CardStats;
  className?: string;
}) {
  const commonComplete = stats.commonTotal > 0 && stats.commonOwned === stats.commonTotal;
  const allComplete = stats.allTotal > 0 && stats.allOwned === stats.allTotal;

  return (
    <div className={className ? `count-lines ${className}` : "count-lines"}>
      <span>
        {stats.commonOwned}/{stats.commonTotal} cartas
        {commonComplete && (
          <span className="complete-check" aria-label="Completo">
            ✓
          </span>
        )}
      </span>
      <span>
        {stats.allOwned}/{stats.allTotal} cartas totais
        {allComplete && (
          <span className="complete-check" aria-label="Completo">
            ✓
          </span>
        )}
      </span>
    </div>
  );
}
