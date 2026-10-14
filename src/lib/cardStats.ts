import type { Rarity } from "@prisma/client";

// Rarities excluded from the "cartas" count, shown separately from "cartas totais".
const RARE_ART_RARITIES = new Set<Rarity>(["AR", "SR", "SAR", "IM", "UR", "S", "SSR"]);

export function isCommonRarity(rarity: Rarity) {
  return !RARE_ART_RARITIES.has(rarity);
}

export type CardStats = {
  commonOwned: number;
  commonTotal: number;
  allOwned: number;
  allTotal: number;
};

export function computeCardStats(
  cards: { rarity: Rarity; ownedQuantity: number }[],
): CardStats {
  let commonOwned = 0;
  let commonTotal = 0;
  let allOwned = 0;
  let allTotal = 0;

  for (const card of cards) {
    allTotal++;
    const owned = card.ownedQuantity > 0;
    if (owned) allOwned++;

    if (isCommonRarity(card.rarity)) {
      commonTotal++;
      if (owned) commonOwned++;
    }
  }

  return { commonOwned, commonTotal, allOwned, allTotal };
}
