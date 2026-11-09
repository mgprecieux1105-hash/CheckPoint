import { expect, test } from "@playwright/test";
import { quickAdd, signUp, skipOnboarding } from "./helpers";

test("mobile layout is fully usable", async ({ page }) => {
  await signUp(page);
  await skipOnboarding(page);
  const nav = page.getByRole("navigation", { name: "Navigation", exact: true });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Journée" }).click();
  await page.waitForURL("**/tracker");
  await quickAdd(page, "Tâche mobile");
  await page.getByRole("button", { name: "Marquer « Tâche mobile » comme accomplie" }).click();
  await expect(page.getByText("100 %").first()).toBeVisible();
  await nav.getByRole("button", { name: "Plus" }).click();
  await page.getByRole("link", { name: "Analyses" }).click();
  await page.waitForURL("**/analytics");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
