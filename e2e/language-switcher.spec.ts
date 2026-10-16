import { expect, test } from "@playwright/test";

test("switching language translates the UI and persists across navigation", async ({ page }) => {
  await page.goto("/decks");

  await expect(page.getByRole("heading", { name: "Baralhos competitivos" })).toBeVisible();
  await expect(page.getByLabel("Ordenar por")).toBeVisible();

  await page.getByLabel("Idioma").selectOption("en");

  await expect(page.getByRole("heading", { name: "Competitive decks" })).toBeVisible();
  await expect(page.getByLabel("Sort by")).toBeVisible();

  // Persists via cookie across a fresh navigation, without re-selecting.
  await page.goto("/collections/E2E1/cards");
  await expect(page.getByRole("heading", { name: "All cards" })).toBeVisible();
  await expect(page.getByPlaceholder("Filter by name...")).toBeVisible();

  // Switch back so other specs sharing this server see the default locale.
  await page.getByLabel("Language").selectOption("pt");
  await expect(page.getByRole("heading", { name: "Todas as cartas" })).toBeVisible();
});
