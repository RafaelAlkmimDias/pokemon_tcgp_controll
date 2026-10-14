import type { CardStats } from "@/lib/cardStats";

export function CardCountLines({
  stats,
  className,
}: {
  stats: CardStats;
  className?: string;
}) {
  return (
    <div className={className ? `count-lines ${className}` : "count-lines"}>
      <span>
        {stats.commonOwned}/{stats.commonTotal} cartas
      </span>
      <span>
        {stats.allOwned}/{stats.allTotal} cartas totais
      </span>
    </div>
  );
}
