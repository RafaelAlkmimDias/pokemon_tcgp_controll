import { describe, expect, it } from "vitest";
import { dictionaries, getDictionary } from "@/lib/i18n/dictionaries";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("getDictionary", () => {
  it("returns the matching locale's dictionary", () => {
    expect(getDictionary("pt")).toBe(dictionaries.pt);
    expect(getDictionary("en")).toBe(dictionaries.en);
  });
});

describe("dictionaries shape", () => {
  it("pt and en expose exactly the same set of keys", () => {
    expect(keyPaths(dictionaries.en).sort()).toEqual(keyPaths(dictionaries.pt).sort());
  });

  it("no string value is empty in either locale", () => {
    for (const locale of ["pt", "en"] as const) {
      const strings = keyPaths(dictionaries[locale])
        .map((path) => path.split(".").reduce<unknown>((obj, key) => (obj as never)[key], dictionaries[locale]))
        .filter((value): value is string => typeof value === "string");
      for (const value of strings) {
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("parameterized dictionary entries", () => {
  it("builds the home page's series/pack-count strings", () => {
    expect(dictionaries.pt.home.series("A")).toBe("Série A");
    expect(dictionaries.en.home.series("A")).toBe("Series A");
    expect(dictionaries.pt.home.packsCount(3)).toBe("3 pacote(s)");
    expect(dictionaries.en.home.packsCount(3)).toBe("3 pack(s)");
  });

  it("builds the collection page's pack alt text and no-pack-cards title", () => {
    expect(dictionaries.pt.collectionPage.packAlt("Mewtwo")).toBe("Pacote Mewtwo");
    expect(dictionaries.en.collectionPage.packAlt("Mewtwo")).toBe("Pack Mewtwo");
    expect(dictionaries.pt.collectionPage.cardsWithoutPackTitle(2)).toBe(
      "Cartas sem pacote específico (2)",
    );
    expect(dictionaries.en.collectionPage.cardsWithoutPackTitle(2)).toBe(
      "Cards without a specific pack (2)",
    );
  });

  it("builds the pack page's title/alt text", () => {
    expect(dictionaries.pt.packPage.title("Mewtwo")).toBe("Pacote Mewtwo");
    expect(dictionaries.en.packPage.title("Mewtwo")).toBe("Pack Mewtwo");
  });

  it("exposes the card tile's quantity-button label prefixes per locale", () => {
    expect(dictionaries.pt.cardTile.increaseLabelPrefix).toBe("Aumentar quantidade de");
    expect(dictionaries.en.cardTile.decreaseLabelPrefix).toBe("Decrease quantity of");
  });

  it("builds the card detail page's stage value, basic vs numbered", () => {
    expect(dictionaries.pt.cardDetailPage.stageValue("basic")).toBe("Básico");
    expect(dictionaries.pt.cardDetailPage.stageValue("2")).toBe("Estágio 2");
    expect(dictionaries.en.cardDetailPage.stageValue("basic")).toBe("Basic");
    expect(dictionaries.en.cardDetailPage.stageValue("2")).toBe("Stage 2");
  });

  it("builds the card detail page's available-in-packs heading, exclusive or not", () => {
    expect(dictionaries.pt.cardDetailPage.availableInPacks(true)).toBe(
      "Disponível exclusivamente no(s) pacote(s)",
    );
    expect(dictionaries.pt.cardDetailPage.availableInPacks(false)).toBe(
      "Disponível no(s) pacote(s)",
    );
    expect(dictionaries.en.cardDetailPage.availableInPacks(true)).toBe(
      "Available exclusively in pack(s)",
    );
    expect(dictionaries.en.cardDetailPage.availableInPacks(false)).toBe("Available in pack(s)");
  });
});
