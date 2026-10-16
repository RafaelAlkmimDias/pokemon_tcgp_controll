import { expect, test } from "@playwright/test";

test("collection name shows the Portuguese translation when one exists", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Conjunto E2E")).toBeVisible();

  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByText("E2E Set")).toBeVisible();
  await expect(page.getByText("Conjunto E2E")).toHaveCount(0);

  // The collection detail and pack screens carry the same resolved name.
  await page.goto("/collections/E2E1");
  await expect(page.getByRole("heading", { name: "E2E Set" })).toBeVisible();
});
