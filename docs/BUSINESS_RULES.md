# CheckPoint — règles métier

Toutes les règles ci-dessous sont implémentées une seule fois dans `src/lib/metrics/index.ts`
(fonctions pures, testées dans `metrics.test.ts`). Aucun écran ne calcule de statistique lui-même :
tableau de bord, projets, historique et analyses consomment les mêmes fonctions et la même source
de données (l'historique complet des tâches, chargé une fois et invalidé à chaque modification).

## Tâches

- Une tâche appartient au **jour pour lequel elle a été planifiée** (`scheduled_date`), même si elle
  est cochée plus tard. Modifier une tâche passée met donc immédiatement à jour l'historique.
- Trois statuts : `pending` (en attente), `completed` (accomplie), `missed` (manquée).
- Une tâche manquée reste dans l'historique et dans les statistiques. Rien n'est supprimé
  automatiquement. Une tâche en attente dont la date est passée est affichée « En retard » mais n'est
  jamais convertie automatiquement : l'utilisateur peut clôturer sa journée (« Marquer le reste comme
  manqué ») de façon explicite.
- `completed_at` est géré par la base (déclencheur) : renseigné au passage à `completed`, effacé sinon.

## Taux d'accomplissement

```
taux = tâches accomplies / tâches planifiées × 100
tâches planifiées = accomplies + manquées + en attente
```

- Les tâches en attente ne comptent jamais comme accomplies.
- Sans tâche planifiée, le taux vaut « — » (null), jamais 0 % : on n'affiche pas un faux échec.

## Calendrier / heatmap

| État            | Règle                                                     |
| --------------- | --------------------------------------------------------- |
| Élevé           | taux ≥ 80 %                                               |
| Moyen           | 50 % ≤ taux < 80 %                                        |
| Faible          | 0 % < taux < 50 %                                         |
| Tâches manquées | jour passé avec des tâches mais aucune accomplie          |
| Planifié        | jour futur (ou aujourd'hui) avec uniquement des tâches en attente |
| Aucune activité | aucune tâche                                              |

## Séries (streaks)

- Un jour est **actif** s'il compte au moins une tâche accomplie (planifiée ce jour-là).
- La série en cours compte les jours actifs consécutifs jusqu'à aujourd'hui. Si aujourd'hui n'est pas
  encore actif, on compte à partir d'hier : la journée en cours ne casse pas la série.
- La plus longue série est calculée sur tout l'historique (jusqu'à aujourd'hui).

## Objectifs

- Deux modes de mesure, choisis explicitement :
  - **Valeur cible** : `valeur actuelle / cible`, mise à jour manuellement (± ou saisie).
  - **Jalons** : `jalons validés / jalons totaux`.
- La progression n'est **jamais** déduite du nombre de tâches liées. Les tâches liées montrent
  l'effort fourni, séparément.
- Un objectif n'est jamais marqué atteint automatiquement : ni quand l'échéance passe (il devient
  « Échéance dépassée »), ni quand la cible est atteinte (l'application propose de confirmer).
- Santé : `at_risk` si la progression a plus de 15 points de retard sur la part de temps écoulée.

## Comparaisons et enseignements

- Les comparaisons utilisent la période précédente de même longueur.
- Un enseignement n'est affiché que si les données le justifient :
  - taux de la semaine : au moins 3 tâches planifiées ;
  - comparaison mensuelle : au moins 3 tâches sur chacune des deux périodes comparables ;
  - meilleur jour de la semaine : au moins 3 jours de la semaine observés, chacun au moins 2 fois ;
  - tendance d'un projet / projet le plus productif : au moins 5 tâches sur chaque période.

## Fuseau horaire

- Les dates de calendrier sont stockées en `date` (sans heure) et manipulées en chaînes `YYYY-MM-DD`.
- « Aujourd'hui » est calculé dans le fuseau du profil (`profiles.timezone`), réglable dans les
  Réglages. Les horodatages (`completed_at`, `created_at`) sont en `timestamptz`.
