import { expect, test } from "@playwright/test";

test.describe("card name filter", () => {
  test("filters a pack's cards live, with no submit button", async ({ page }) => {
    await page.goto("/collections/E2E1/packs/Test%20Pack");

    const input = page.getByPlaceholder("Filtrar por nome...");
    await expect(input).toBeVisible();
    await expect(page.getByText("Bulbasaur")).toBeVisible();
    await expect(page.getByText("Charmander")).toBeVisible();

    await input.fill("bulba");

    await expect(page.getByText("Bulbasaur")).toBeVisible();
    await expect(page.getByText("Charmander")).toHaveCount(0);

    // No submit button anywhere near the filter - it's pure live filtering.
    await expect(page.locator(".floating-search button")).toHaveCount(0);
  });

  test("also filters the full 'all cards' listing for the collection", async ({ page }) => {
    await page.goto("/collections/E2E1/cards");

    await page.getByPlaceholder("Filtrar por nome...").fill("char");

    await expect(page.getByText("Charmander")).toBeVisible();
    await expect(page.getByText("Bulbasaur")).toHaveCount(0);
  });

  test("shows an empty state when nothing matches", async ({ page }) => {
    await page.goto("/collections/E2E1/cards");

    await page.getByPlaceholder("Filtrar por nome...").fill("zzznotacard");

    await expect(page.getByText("Nenhuma carta encontrada para esse filtro.")).toBeVisible();
  });
});
