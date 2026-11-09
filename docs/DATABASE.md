# CheckPoint — base de données

PostgreSQL (Supabase). Migrations : `supabase/migrations/`. Types TypeScript générés :
`src/lib/supabase/database.types.ts` (`npm run db:types`).

## Schéma

```
auth.users ─1:1─ profiles
profiles ─1:n─ projects ─1:n─ goals ─1:n─ milestones
profiles ─1:n─ tasks ──> projects (optionnel), goals (optionnel)
profiles ─1:n─ daily_reflections (unique par jour)
profiles ─1:n─ notifications
```

| Table               | Rôle                                   | Points clés |
| ------------------- | -------------------------------------- | ----------- |
| `profiles`          | Profil, fuseau, 1er jour de semaine, thème, domaines, préférences (jsonb), fin d'onboarding | Créé par déclencheur à l'inscription |
| `projects`          | Projets (couleur, icône, dates, priorité, statut, archivage) | Nom unique par utilisateur (insensible à la casse) |
| `goals`             | Objectifs (type, mode `target`/`milestones`, valeur cible/actuelle, unité, dates) | `achieved_at` géré par déclencheur |
| `milestones`        | Jalons d'un objectif                   | `completed_at` géré par déclencheur, suppression en cascade avec l'objectif |
| `tasks`             | Accomplissements quotidiens            | `scheduled_date`, `due_date`, `completed_at` géré par déclencheur |
| `daily_reflections` | Réflexion du jour (3 questions + humeur) | `unique (user_id, reflection_date)` |
| `notifications`     | Notifications in-app                   | `unique (user_id, dedupe_key)` pour l'idempotence |

Toutes les clés sont des UUID. Les champs `is_demo` marquent l'espace de démonstration.

## Sécurité

- **RLS activée sur toutes les tables.** Chaque politique impose `auth.uid() = user_id`
  (ou `= id` pour `profiles`). Rôle `anon` : aucun accès.
- **Clés étrangères composites** `(project_id, user_id)` → `projects (id, user_id)` (idem pour
  `goal_id`, `milestones.goal_id`) : impossible de rattacher une tâche au projet d'un autre utilisateur,
  même en forgeant une requête.
- `user_id` a pour valeur par défaut `auth.uid()` et ne peut pas être modifié (déclencheur).
- Suppression d'un projet ou d'un objectif : les tâches sont conservées (`ON DELETE SET NULL (col)`),
  l'historique n'est jamais perdu.
- Contraintes `CHECK` sur les longueurs, couleurs, dates cohérentes et valeurs positives (validation
  côté serveur en plus de Zod côté client).
- Fonctions RPC (`search_tasks`, `generate_due_notifications`, `seed_demo_workspace`,
  `clear_demo_workspace`) en `security invoker` : elles s'exécutent avec les droits et la RLS de
  l'appelant. Seules `handle_new_user`, `notify_goal_achieved` et `delete_my_account` sont
  `security definer`, avec `search_path` vide, et n'agissent que sur `auth.uid()`.
- La clé service-role n'est utilisée nulle part dans l'application.

Tests : `supabase/tests/rls_isolation.sql` (`npm run test:db`) vérifie l'isolation entre deux
utilisateurs, le refus des liens inter-utilisateurs, la conservation de l'historique, l'unicité des
réflexions, les notifications et le nettoyage de la démo.

## Index

`tasks (user_id, scheduled_date desc)`, `tasks (user_id, status)`, `tasks (project_id, scheduled_date desc)`,
`tasks (goal_id)`, index trigramme sur `tasks.title` (recherche), `goals (user_id, status)`,
`projects (user_id, status)`, `milestones (goal_id, position)`, `notifications (user_id, created_at desc)`.
