# CheckPoint

> Vos progrès, mesurés. Vos accomplissements, mémorisés.

CheckPoint est une application de suivi des accomplissements quotidiens : on planifie sa journée,
on note ce qui a été accompli ou manqué, et l'application construit un historique, un calendrier
de performance, des objectifs mesurables et des analyses calculées à partir des vraies données.

## Fonctionnalités

| Section | Contenu |
| --- | --- |
| **Vue d'ensemble** | Salutation, message contextuel, 4 KPI (accomplissements, taux, série, objectifs) avec comparaison à la période précédente, graphique quotidien 7 j / 30 j / 90 j / 12 m, activité récente, objectifs prioritaires, calendrier cliquable |
| **Suivi du jour** | Navigation par date, anneau de progression, compteurs, saisie rapide (Entrée, `#catégorie @projet !priorité`), statuts accomplie / manquée / en attente, édition complète (description, catégorie, projet, objectif, priorité, échéance, notes), suppression confirmée, clôture de journée, réflexion du jour (3 questions + humeur) |
| **Projets** | Création / édition / archivage / suppression, couleur et icône, tableau de bord par projet avec onglets Vue d'ensemble, Tâches, Calendrier, Statistiques |
| **Objectifs** | Hebdomadaires, mensuels, annuels, long terme ; mesure par valeur cible ou par jalons ; mise à jour de la progression ; santé (en bonne voie, en retard, échéance dépassée) ; tâches associées ; archivage |
| **Historique** | Calendrier mensuel, hebdomadaire et annuel (heatmap), vue liste par période, détail du jour (tâches + réflexion), filtres projet / catégorie / objectif / statut / période, recherche plein texte, comparaison avec la période précédente |
| **Analyses** | Taux global, hebdo, mensuel, annuel ; accomplissements et tâches manquées ; productivité moyenne ; séries ; meilleur jour ; projet le plus productif ; 7 graphiques interactifs ; enseignements générés uniquement quand les données le permettent |
| **Réglages** | Profil, thème clair / sombre / système, premier jour de semaine, fuseau horaire, préférences de notification, export JSON / CSV, espace de démo, mot de passe, suppression du compte |
| **Global** | Menu de commandes `⌘K` / `Ctrl+K` (navigation, création, recherche dans l'historique), raccourcis `N` (nouvelle tâche) et `G` + lettre, notifications (échéances, objectifs atteints, rappel de réflexion), onboarding en 5 étapes facultatives, navigation mobile dédiée, mode sombre conçu à part |

## Architecture

```
src/
  app/                    Routes (App Router)
    (auth)/               Connexion, inscription, mot de passe oublié
    (app)/                Application protégée : overview, tracker, projects, objectives, history, analytics, settings
    auth/                 Callbacks Supabase (code PKCE, token hash, déconnexion)
    onboarding/           Parcours de premier lancement
  components/
    ui/                   Design system (boutons, cartes, dialogues, menus, onglets…)
    shell/                Sidebar, navigation mobile, notifications, menu de commandes
    tasks/ projects/ goals/ history/ analytics/ overview/ tracker/
  lib/
    metrics/              ★ Toutes les règles de calcul (fonctions pures, testées)
    data/                 Accès aux données (TanStack Query + Supabase), mises à jour optimistes avec rollback
    supabase/             Clients navigateur / serveur / middleware, types générés
    dates.ts validation.ts quick-add.ts export.ts
  middleware.ts           Protection des routes, rafraîchissement de session
supabase/
  migrations/             Schéma, RLS, déclencheurs, RPC, espace de démo
  tests/                  Tests SQL d'isolation et de règles métier
e2e/                      Tests Playwright des parcours critiques
docs/                     Règles métier et schéma de base de données
```

**Stack** : Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · composants Radix
(style shadcn/ui) · Lucide · Supabase (Auth, PostgreSQL, RLS) · TanStack Query · Recharts (chargé à
la demande) · React Hook Form + Zod · date-fns · Vitest · Playwright.

Choix notables :
- **Une seule source de vérité pour les chiffres** : l'historique des tâches (colonnes légères) est
  chargé une fois et toutes les métriques en dérivent via `src/lib/metrics`. Toute modification
  invalide ce cache, donc les écrans restent cohérents entre eux.
- **Sécurité dans la base** : la RLS et des clés étrangères composites garantissent l'isolation même
  si le client est contourné. Voir [docs/DATABASE.md](docs/DATABASE.md).
- Règles de calcul documentées dans [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md).

## Développement local

Prérequis : Node.js 20+ (22 recommandé), Docker (pour Supabase en local).

```bash
npm install
npx supabase start          # démarre Postgres, Auth, API (applique les migrations)
cp .env.example .env.local  # puis collez l'URL et l'anon key affichées par `supabase start`
npm run dev                 # http://127.0.0.1:3000
```

`npx supabase status` réaffiche l'URL et les clés. En local, les e-mails (confirmation, mot de passe
oublié) sont visibles dans Mailpit : http://127.0.0.1:54324.

Pour explorer rapidement : créez un compte puis cliquez « Explorer avec la démo » (2 mois
d'historique fictif, marqué « Démo », supprimable en un clic depuis la vue d'ensemble ou les réglages).

### Variables d'environnement

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de l'API Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (anon / publishable). Sans danger côté navigateur : l'accès est contrôlé par la RLS |

La clé service-role n'est **pas** nécessaire et ne doit jamais être ajoutée à l'application.

### Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Développement, build de production, serveur de production |
| `npm run lint` / `typecheck` | ESLint, TypeScript |
| `npm test` | Tests unitaires des calculs (Vitest) |
| `npm run test:db` | Tests SQL de sécurité et de règles métier (Supabase local démarré) |
| `npm run test:e2e` | Tests end-to-end Playwright (Supabase local + `npm run build` requis) |
| `npm run db:reset` | Réinitialise la base locale et rejoue les migrations |
| `npm run db:types` | Régénère les types TypeScript depuis la base locale |

## Déploiement

1. **Supabase** : créez un projet sur https://supabase.com, puis :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # applique les migrations
   ```
2. Dans *Authentication → URL Configuration* : *Site URL* = l'URL de production, et ajoutez
   `https://<votre-domaine>/**` aux *Redirect URLs* (nécessaire pour la confirmation d'e-mail et le
   mot de passe oublié). Configurez un SMTP pour les e-mails en production.
3. **Vercel** (ou tout hébergeur Next.js) : importez le dépôt, définissez
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, déployez.

## Tests

- **Unitaires** (`npm test`) : 34 tests sur le taux d'accomplissement, les états du calendrier, les
  séries (y compris changement d'année), les périodes et regroupements hebdo / mensuels selon le
  premier jour de semaine, les moyennes, la progression et la santé des objectifs, les enseignements
  (aucun enseignement sans données suffisantes), le fuseau horaire et la saisie rapide.
- **Base de données** (`npm run test:db`) : isolation entre deux utilisateurs (lecture, écriture,
  suppression, recherche), refus des liens vers les données d'un autre utilisateur, historique conservé
  à la suppression d'un projet, unicité des réflexions, notifications idempotentes, nettoyage de la démo
  sans toucher aux vraies données, aucun accès anonyme.
- **End-to-end** (`npm run test:e2e`) : inscription + onboarding complet, connexion / déconnexion,
  mauvais mot de passe, mot de passe oublié, routes protégées, suivi du jour (création, statuts,
  édition, suppression, réflexion persistante), projets (création, tableau de bord, édition,
  archivage), objectifs (cible, progression, jalons, atteinte), historique (calendrier, détail du jour,
  vues, recherche, filtres), menu de commandes, isolation entre deux comptes, mise en page mobile.

## Limites connues

- L'interface est en français uniquement (pas encore d'i18n).
- Pas de tâches récurrentes : chaque tâche est planifiée pour un jour donné.
- Les notifications sont internes à l'application (pas d'e-mail ni de push). Les rappels d'échéance
  sont générés à l'ouverture de l'application.
- Pas de mode hors ligne ; une connexion est nécessaire.
- Connexion par e-mail / mot de passe uniquement (pas de fournisseur OAuth configuré).
- L'historique léger est chargé en entier côté client pour garantir la cohérence des métriques :
  adapté à plusieurs dizaines de milliers de tâches par utilisateur ; au-delà, déplacer les agrégats
  dans des vues SQL.
- L'avatar est généré à partir des initiales (pas d'envoi de photo).
