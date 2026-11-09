import { expect, test } from "@playwright/test";
import { logout, quickAdd, signUp, skipOnboarding } from "./helpers";

test("users never see each other's data", async ({ page }) => {
  await signUp(page, "Alice");
  await skipOnboarding(page);
  await page.goto("/tracker");
  await quickAdd(page, "Secret d'Alice");
  await expect(page.getByText("Secret d'Alice")).toBeVisible();
  await logout(page);

  await signUp(page, "Bob");
  await skipOnboarding(page);
  await page.goto("/tracker");
  await expect(page.getByText("Secret d'Alice")).toHaveCount(0);
  await page.goto("/history");
  await page.getByLabel("Rechercher dans l'historique").fill("Secret");
  await expect(page.getByText("Aucun résultat")).toBeVisible();
});
