import type { CardStats } from "@/lib/cardStats";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function CardCountLines({
  stats,
  className,
  t,
}: {
  stats: CardStats;
  className?: string;
  t: Dictionary["cardCountLines"];
}) {
  const commonComplete = stats.commonTotal > 0 && stats.commonOwned === stats.commonTotal;
  const allComplete = stats.allTotal > 0 && stats.allOwned === stats.allTotal;

  return (
    <div className={className ? `count-lines ${className}` : "count-lines"}>
      <span>
        {stats.commonOwned}/{stats.commonTotal} {t.cardsLabel}
        {commonComplete && (
          <span className="complete-check" aria-label={t.completeAriaLabel}>
            ✓
          </span>
        )}
      </span>
      <span>
        {stats.allOwned}/{stats.allTotal} {t.totalCardsLabel}
        {allComplete && (
          <span className="complete-check" aria-label={t.completeAriaLabel}>
            ✓
          </span>
        )}
      </span>
    </div>
  );
}
