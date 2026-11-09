import { expect, test } from "@playwright/test";
import { PASSWORD, login, logout, signUp, skipOnboarding } from "./helpers";

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/analytics");
  await expect(page).toHaveURL(/\/login\?next=%2Fanalytics/);
});

test("registration, onboarding, logout and login", async ({ page }) => {
  const email = await signUp(page, "Alex Martin");
  // onboarding: name → areas → project → goal → tasks
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: /Études/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Nom du projet").fill("Licence de droit");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Objectif", { exact: true }).fill("Lire 4 livres");
  await page.getByLabel("Cible").fill("4");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Tâche 1").fill("Relire le cours de droit civil");
  await page.getByRole("button", { name: "Accéder à mon tableau de bord" }).click();
  await page.waitForURL("**/tracker");
  await expect(page.getByText("Relire le cours de droit civil")).toBeVisible();

  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: /Alex/ })).toBeVisible();
  await logout(page);
  await login(page, email);
  await expect(page.getByRole("heading", { name: /Alex/ })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  const email = await signUp(page);
  await skipOnboarding(page);
  await logout(page);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD + "x");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
});

test("password recovery request", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill("someone@e2e.local");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("heading", { name: "E-mail envoyé" })).toBeVisible();
});
