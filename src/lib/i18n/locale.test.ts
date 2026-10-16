import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/i18n/locale";

describe("isLocale", () => {
  it("accepts pt and en", () => {
    expect(isLocale("pt")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects anything else, including undefined/null", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("LOCALES / DEFAULT_LOCALE", () => {
  it("lists exactly pt and en, defaulting to pt", () => {
    expect(LOCALES).toEqual(["pt", "en"]);
    expect(DEFAULT_LOCALE).toBe("pt");
  });
});
