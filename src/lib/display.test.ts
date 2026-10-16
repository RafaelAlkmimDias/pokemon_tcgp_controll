import { describe, expect, it } from "vitest";
import {
  capitalize,
  formatDate,
  formatPercent,
  getElementLabel,
  getRarityLabel,
  getTypeLabel,
  RARITY_CLASS,
} from "@/lib/display";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/locale";

describe("formatDate", () => {
  it("formats a date using long pt-BR style for the pt locale", () => {
    const formatted = formatDate(new Date("2026-03-05T00:00:00Z"), "pt");
    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/março/i);
  });

  it("formats a date using long en-US style for the en locale", () => {
    const formatted = formatDate(new Date("2026-03-05T00:00:00Z"), "en");
    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/march/i);
  });

  it("falls back to a locale-specific placeholder for a null date", () => {
    expect(formatDate(null, "pt")).toBe("Data desconhecida");
    expect(formatDate(null, "en")).toBe("Unknown date");
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
  it("has a rarity label and css class for every rarity, in every locale", () => {
    for (const locale of LOCALES) {
      for (const rarity of Object.keys(dictionaries[locale].rarity)) {
        expect(getRarityLabel(rarity as never, locale)).toBeTruthy();
        expect(RARITY_CLASS[rarity as keyof typeof RARITY_CLASS]).toBeTruthy();
      }
    }
  });

  it("has a label for every card type, in every locale", () => {
    for (const locale of LOCALES) {
      for (const type of Object.keys(dictionaries[locale].cardType)) {
        expect(getTypeLabel(type as never, locale)).toBeTruthy();
      }
    }
  });

  it("maps known elements to a label per locale", () => {
    expect(getElementLabel("fire", "pt")).toBe("Fogo");
    expect(getElementLabel("water", "pt")).toBe("Água");
    expect(getElementLabel("fire", "en")).toBe("Fire");
    expect(getElementLabel("water", "en")).toBe("Water");
  });

  it("falls back to a capitalized element code for an unknown element", () => {
    expect(getElementLabel("mystery", "en")).toBe("Mystery");
  });
});
