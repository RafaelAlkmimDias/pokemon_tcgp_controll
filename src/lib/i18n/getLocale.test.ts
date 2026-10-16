import { describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getMock })),
}));

const { getLocale } = await import("@/lib/i18n/getLocale");

describe("getLocale", () => {
  it("reads a valid locale cookie", async () => {
    getMock.mockReturnValueOnce({ value: "en" });
    expect(await getLocale()).toBe("en");
  });

  it("falls back to the default locale when the cookie is missing", async () => {
    getMock.mockReturnValueOnce(undefined);
    expect(await getLocale()).toBe("pt");
  });

  it("falls back to the default locale when the cookie value is invalid", async () => {
    getMock.mockReturnValueOnce({ value: "fr" });
    expect(await getLocale()).toBe("pt");
  });
});
