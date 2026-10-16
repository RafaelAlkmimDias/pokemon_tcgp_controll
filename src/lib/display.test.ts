import { describe, expect, it } from "vitest";
import {
  capitalize,
  ELEMENT_LABEL,
  formatDate,
  formatPercent,
  RARITY_CLASS,
  RARITY_LABEL,
  TYPE_LABEL,
} from "@/lib/display";

describe("formatDate", () => {
  it("formats a date using long pt-BR style", () => {
    const formatted = formatDate(new Date("2026-03-05T00:00:00Z"));
    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/março/i);
  });

  it("falls back to a placeholder for a null date", () => {
    expect(formatDate(null)).toBe("Data desconhecida");
  });
});

describe("capitalize", () => {
  it("uppercases only the first letter", () => {
    expect(capitalize("fire")).toBe("Fire");
    expect(capitalize("a")).toBe("A");
  });
});

describe("formatPercent", () => {
  it("converts a 0-1 fraction into a one-decimal percentage string", () => {
    expect(formatPercent(0.543)).toBe("54.3%");
    expect(formatPercent(1)).toBe("100.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("label dictionaries", () => {
  it("has a rarity label and css class for every rarity", () => {
    for (const rarity of Object.keys(RARITY_LABEL)) {
      expect(RARITY_LABEL[rarity as keyof typeof RARITY_LABEL]).toBeTruthy();
      expect(RARITY_CLASS[rarity as keyof typeof RARITY_CLASS]).toBeTruthy();
    }
  });

  it("has a label for every card type", () => {
    for (const type of Object.keys(TYPE_LABEL)) {
      expect(TYPE_LABEL[type as keyof typeof TYPE_LABEL]).toBeTruthy();
    }
  });

  it("maps known elements to a Portuguese label", () => {
    expect(ELEMENT_LABEL.fire).toBe("Fogo");
    expect(ELEMENT_LABEL.water).toBe("Água");
  });
});
