import { expect, test } from "@playwright/test";

test("home and play routes load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BACKROOMS // VHS SIM" })).toBeVisible();

  await page.goto("/play");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Backrooms Session" })).toBeVisible();
});
