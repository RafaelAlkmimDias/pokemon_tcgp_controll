import { expect, test } from "@playwright/test";

test("incrementing and decrementing owned quantity persists through the server action", async ({
  page,
}) => {
  await page.goto("/collections/E2E1/cards");

  const charmanderTile = page.locator(".card-tile", { hasText: "Charmander" });
  await expect(charmanderTile.getByText("0", { exact: true })).toBeVisible();

  await charmanderTile.getByRole("button", { name: /Aumentar quantidade/ }).click();
  await expect(charmanderTile.getByText("1", { exact: true })).toBeVisible();
  await expect(charmanderTile).toHaveClass(/card-tile-owned/);

  await charmanderTile.getByRole("button", { name: /Diminuir quantidade/ }).click();
  await expect(charmanderTile.getByText("0", { exact: true })).toBeVisible();
  await expect(charmanderTile).not.toHaveClass(/card-tile-owned/);
});
