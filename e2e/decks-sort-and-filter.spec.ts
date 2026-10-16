import { expect, test } from "@playwright/test";

test("decks list sorts by meta relevance by default and re-sorts on demand", async ({ page }) => {
  await page.goto("/decks");

  const titles = () => page.locator(".tile-title").allTextContents();

  const initial = await titles();
  expect(initial.indexOf("E2E Sort Deck A")).toBeLessThan(initial.indexOf("E2E Sort Deck B"));

  await page.getByLabel(/Ordenar por/).selectOption("popularity");
  await expect(page.locator(".tile-title").first()).toBeVisible();

  // Both decks are fully equipped (1/1), so switching to the
  // "quantidade certa" sort shouldn't drop either one from the list.
  await page.getByLabel(/Ordenar por/).selectOption("sufficientCount");
  const afterSort = await titles();
  expect(afterSort).toContain("E2E Sort Deck A");
  expect(afterSort).toContain("E2E Sort Deck B");
});
