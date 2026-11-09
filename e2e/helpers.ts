import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.local`;
}

export const PASSWORD = "Sup3r-secret!";

/** Signs up a fresh user and skips onboarding. */
export async function signUp(page: Page, name = "Camille Test", email = uniqueEmail()) {
  await page.goto("/signup");
  await page.getByLabel("Nom").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/onboarding");
  return email;
}

export async function skipOnboarding(page: Page) {
  await page.getByRole("button", { name: "Passer et accéder au tableau de bord" }).click();
  await page.waitForURL("**/overview");
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/overview");
}

export async function quickAdd(page: Page, text: string) {
  const input = page.getByLabel("Ajouter une tâche rapidement");
  await input.fill(text);
  await input.press("Enter");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Menu du compte" }).first().click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: /Bon retour/ })).toBeVisible();
}
