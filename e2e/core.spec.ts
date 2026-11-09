import { expect, test } from "@playwright/test";
import { quickAdd, signUp, skipOnboarding } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signUp(page);
  await skipOnboarding(page);
});

test("daily tracker: create, complete, miss, edit, delete and reflect", async ({ page }) => {
  await page.goto("/tracker");
  await expect(page.getByText("Rien de prévu pour l'instant")).toBeVisible();

  await quickAdd(page, "Écrire le rapport #Travail !!");
  await quickAdd(page, "Faire du sport");
  await quickAdd(page, "Appeler la banque");
  await expect(page.getByText("Écrire le rapport")).toBeVisible();
  await expect(page.getByText("#Travail")).toBeVisible();

  // complete one
  await page.getByRole("button", { name: "Marquer « Écrire le rapport » comme accomplie" }).click();
  await expect(page.getByRole("heading", { name: /Accomplies/ })).toBeVisible();
  await expect(page.getByText("33 %").first()).toBeVisible();

  // miss one through the actions menu
  await page.getByRole("button", { name: "Actions pour « Faire du sport »" }).click();
  await page.getByRole("menuitem", { name: "Manquée" }).click();
  await expect(page.getByRole("heading", { name: /Manquées/ })).toBeVisible();

  // edit via dialog
  await page.getByRole("button", { name: /^Appeler la banque/ }).click();
  await page.getByLabel("Titre").fill("Appeler la banque (prêt)");
  await page.getByLabel("Notes").fill("Demander le taux");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Appeler la banque (prêt)")).toBeVisible();

  // delete with confirmation
  await page.getByRole("button", { name: "Actions pour « Appeler la banque (prêt) »" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("Appeler la banque (prêt)")).toHaveCount(0);

  // stats: 1 completed, 1 missed → 50 %
  await expect(page.getByText("50 %").first()).toBeVisible();

  // reflection persists
  await page.getByLabel("Qu'est-ce qui s'est bien passé ?").fill("Rapport terminé tôt");
  await page.getByRole("button", { name: "Enregistrer la réflexion" }).click();
  await expect(page.getByText("Enregistrée", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Qu'est-ce qui s'est bien passé ?")).toHaveValue("Rapport terminé tôt");
});

test("projects: create, dashboard, edit and archive", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page.getByLabel("Nom").fill("Université");
  await page.getByLabel("Description").fill("Master 2");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Université" })).toBeVisible();

  await page.getByRole("tab", { name: /Tâches/ }).click();
  await quickAdd(page, "Réviser le partiel");
  await expect(page.getByText("Réviser le partiel")).toBeVisible();
  await page.getByRole("button", { name: "Marquer « Réviser le partiel » comme accomplie" }).click();
  await page.getByRole("tab", { name: /Vue d'ensemble/ }).click();
  await expect(page.getByText("100 %").first()).toBeVisible();

  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Nom").fill("Université Paris");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Université Paris" })).toBeVisible();

  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitem", { name: "Archiver" }).click();
  await expect(page.getByText("Archivé", { exact: true })).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText("Aucun projet pour l'instant")).toBeVisible();
  await page.getByRole("tab", { name: /Archivés/ }).click();
  await expect(page.getByText("Université Paris")).toBeVisible();
});

test("objectives: create with target, update progress, milestones and achieve", async ({ page }) => {
  await page.goto("/objectives");
  await page.getByRole("button", { name: "Nouvel objectif" }).first().click();
  await page.getByLabel("Titre").fill("Courir 20 km");
  await page.getByLabel("Actuel").fill("0");
  await page.getByLabel("Cible").fill("20");
  await page.getByLabel("Unité").fill("km");
  await page.getByRole("button", { name: "Créer l'objectif" }).click();
  await page.waitForURL(/\/objectives\/[0-9a-f-]+$/);
  await expect(page.getByText("0 / 20 km")).toBeVisible();

  await page.getByLabel("Nouvelle valeur").fill("10");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("10 / 20 km")).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter 1" }).click();
  await expect(page.getByText("11 / 20 km")).toBeVisible();

  await page.getByLabel("Nouveau jalon").fill("Premier 10 km");
  await page.getByRole("button", { name: "Ajouter le jalon" }).click();
  await page.getByRole("button", { name: "Valider « Premier 10 km »" }).click();
  await expect(page.getByRole("button", { name: "Rouvrir « Premier 10 km »" })).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme atteint" }).click();
  await expect(page.getByRole("button", { name: "Rouvrir", exact: true })).toBeVisible();
  await page.goto("/objectives");
  await page.getByRole("tab", { name: "Terminés" }).click();
  await expect(page.getByText("Courir 20 km")).toBeVisible();
});

test("history: calendar navigation, day detail, search and filters", async ({ page }) => {
  await page.goto("/tracker");
  await quickAdd(page, "Lire un article sur Rust");
  await page.getByRole("button", { name: "Jour précédent" }).click();
  await quickAdd(page, "Tâche d'hier oubliée");
  await page.getByRole("button", { name: "Actions pour « Tâche d'hier oubliée »" }).click();
  await page.getByRole("menuitem", { name: "Manquée" }).click();

  await page.goto("/history");
  await page.getByRole("gridcell", { name: /aucune activité|accomplies/ }).first().waitFor();
  const yesterdayCell = page.getByRole("gridcell", { name: /0 sur 1 accomplies/ });
  await yesterdayCell.first().click();
  await expect(page.getByText("Tâche d'hier oubliée")).toBeVisible();
  await expect(page.getByText("Manquée", { exact: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Année" }).click();
  await expect(page.getByText(/^\d{4}$/)).toBeVisible();
  await page.getByRole("tab", { name: "Semaine" }).click();
  await expect(page.getByText(/Semaine du/)).toBeVisible();

  await page.getByLabel("Rechercher dans l'historique").fill("Rust");
  await expect(page.getByText("Résultats pour « Rust »")).toBeVisible();
  await expect(page.getByText("Lire un article sur Rust")).toBeVisible();
  await page.getByLabel("Statut").selectOption("missed");
  await expect(page.getByText("Aucun résultat")).toBeVisible();
});

test("command menu: navigate and create", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Rechercher une tâche, aller à une page, créer…").fill("Analyses");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/analytics");
  await expect(page.getByText("Pas encore assez de données")).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByRole("option", { name: "Nouveau projet" }).click();
  await expect(page.getByRole("dialog", { name: "Nouveau projet" })).toBeVisible();
});
