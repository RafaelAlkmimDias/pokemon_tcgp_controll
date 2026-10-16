import { expect, test } from "@playwright/test";

// You can't use the same physical card in two built decks at once - marking
// a deck as built should reserve its cards and reduce what's shown as
// available for any other deck sharing the same print.
test("marking a deck built reduces another deck's available copies of a shared card", async ({
  page,
}) => {
  await page.goto("/decks/e2e-other-deck");
  await expect(page.locator(".count-lines-header")).toContainText("1/1 cartas na quantidade certa");
  await expect(page.locator(".card-tile", { hasText: "Squirtle" })).toHaveClass(
    /card-tile-owned/,
  );

  await page.goto("/decks/e2e-built-deck");
  await page.getByRole("button", { name: "Marcar como montado" }).click();
  await expect(page.getByRole("button", { name: "Desmarcar como montado" })).toBeVisible();
  // The built deck itself isn't penalized for claiming its own 2 copies.
  await expect(page.locator(".count-lines-header")).toContainText("1/1 cartas na quantidade certa");

  await page.goto("/decks/e2e-other-deck");
  await expect(page.locator(".count-lines-header")).toContainText("0/1 cartas na quantidade certa");
  await expect(page.locator(".card-tile", { hasText: "Squirtle" })).toHaveClass(
    /card-tile-missing/,
  );

  // Restore state for any other spec/run that might rely on the fixture seed.
  await page.goto("/decks/e2e-built-deck");
  await page.getByRole("button", { name: "Desmarcar como montado" }).click();
  await expect(page.getByRole("button", { name: "Marcar como montado" })).toBeVisible();
});
