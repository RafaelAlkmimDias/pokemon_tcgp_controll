import { describe, expect, it } from "vitest";
import { computeCardStats, isCommonRarity } from "@/lib/cardStats";

describe("isCommonRarity", () => {
  it("treats standard rarities as common", () => {
    expect(isCommonRarity("C")).toBe(true);
    expect(isCommonRarity("U")).toBe(true);
    expect(isCommonRarity("R")).toBe(true);
    expect(isCommonRarity("RR")).toBe(true);
  });

  it("excludes rare-art rarities", () => {
    expect(isCommonRarity("AR")).toBe(false);
    expect(isCommonRarity("SR")).toBe(false);
    expect(isCommonRarity("SAR")).toBe(false);
    expect(isCommonRarity("IM")).toBe(false);
    expect(isCommonRarity("UR")).toBe(false);
    expect(isCommonRarity("S")).toBe(false);
    expect(isCommonRarity("SSR")).toBe(false);
  });
});

describe("computeCardStats", () => {
  it("returns all zeros for an empty list", () => {
    expect(computeCardStats([])).toEqual({
      commonOwned: 0,
      commonTotal: 0,
      allOwned: 0,
      allTotal: 0,
    });
  });

  it("counts owned vs total, separating common from rare-art rarities", () => {
    const stats = computeCardStats([
      { rarity: "C", ownedQuantity: 2 },
      { rarity: "C", ownedQuantity: 0 },
      { rarity: "UR", ownedQuantity: 1 },
      { rarity: "UR", ownedQuantity: 0 },
    ]);

    expect(stats).toEqual({
      commonOwned: 1,
      commonTotal: 2,
      allOwned: 2,
      allTotal: 4,
    });
  });

  it("counts a card as owned once ownedQuantity is at least 1", () => {
    const stats = computeCardStats([{ rarity: "C", ownedQuantity: 5 }]);
    expect(stats.commonOwned).toBe(1);
    expect(stats.allOwned).toBe(1);
  });
});
