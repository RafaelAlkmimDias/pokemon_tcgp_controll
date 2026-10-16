import { describe, expect, it } from "vitest";
import { cardImageUrl, collectionLogoUrl, packImageUrl } from "@/lib/images";

describe("cardImageUrl", () => {
  it("lowercases a regular collection code into the slug", () => {
    expect(cardImageUrl("A1", 7)).toBe("/images/cards/a1/007.webp");
  });

  it("maps promo collection codes to their short slug", () => {
    expect(cardImageUrl("PROMO-A", 3)).toBe("/images/cards/pa/003.webp");
    expect(cardImageUrl("PROMO-B", 42)).toBe("/images/cards/pb/042.webp");
  });

  it("pads the card number to 3 digits", () => {
    expect(cardImageUrl("A1", 1)).toBe("/images/cards/a1/001.webp");
    expect(cardImageUrl("A1", 123)).toBe("/images/cards/a1/123.webp");
  });
});

describe("packImageUrl", () => {
  it("returns an image path for packs that ship their own art", () => {
    expect(packImageUrl("Charizard")).toBe("/images/packs/Charizard.webp");
  });

  it("returns null for packs without box art", () => {
    expect(packImageUrl("Vol. 1")).toBeNull();
  });

  it("url-encodes the pack name", () => {
    expect(packImageUrl("Deluxe Pack Mega")).toBe("/images/packs/Deluxe%20Pack%20Mega.webp");
  });
});

describe("collectionLogoUrl", () => {
  it("builds the logo path from the collection code", () => {
    expect(collectionLogoUrl("A1a")).toBe("/images/sets/A1a.webp");
  });
});
