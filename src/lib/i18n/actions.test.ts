import { describe, expect, it, vi } from "vitest";

const setMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: setMock })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setLocale } = await import("@/lib/i18n/actions");
const { revalidatePath } = await import("next/cache");

describe("setLocale", () => {
  it("sets the locale cookie and revalidates the app", async () => {
    await setLocale("en");

    expect(setMock).toHaveBeenCalledWith(
      "locale",
      "en",
      expect.objectContaining({ path: "/" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("ignores an invalid locale value", async () => {
    setMock.mockClear();
    await setLocale("fr");
    expect(setMock).not.toHaveBeenCalled();
  });
});
