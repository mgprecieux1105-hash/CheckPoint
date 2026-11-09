import type { GoalStatus, GoalType, Priority, ProjectStatus, TaskStatus } from "@/lib/types";

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "low", label: "Basse", color: "var(--muted-foreground)" },
  { value: "medium", label: "Moyenne", color: "var(--secondary)" },
  { value: "high", label: "Haute", color: "var(--warning)" },
  { value: "urgent", label: "Urgente", color: "var(--danger)" },
];
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label])) as Record<Priority, string>;
export const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: "success" | "danger" | "neutral" }> = {
  completed: { label: "Accomplie", tone: "success" },
  missed: { label: "Manquée", tone: "danger" },
  pending: { label: "En attente", tone: "neutral" },
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: "primary" | "warning" | "success" | "neutral" }> = {
  active: { label: "Actif", tone: "primary" },
  paused: { label: "En pause", tone: "warning" },
  completed: { label: "Terminé", tone: "success" },
  archived: { label: "Archivé", tone: "neutral" },
};

export const GOAL_TYPES: { value: GoalType; label: string; short: string }[] = [
  { value: "weekly", label: "Hebdomadaire", short: "Semaine" },
  { value: "monthly", label: "Mensuel", short: "Mois" },
  { value: "annual", label: "Annuel", short: "Année" },
  { value: "custom", label: "Long terme", short: "Long terme" },
];
export const GOAL_TYPE_LABEL = Object.fromEntries(GOAL_TYPES.map((g) => [g.value, g.label])) as Record<GoalType, string>;

export const GOAL_STATUS: Record<GoalStatus, { label: string; tone: "neutral" | "primary" | "success" | "danger" }> = {
  not_started: { label: "Non commencé", tone: "neutral" },
  in_progress: { label: "En cours", tone: "primary" },
  achieved: { label: "Atteint", tone: "success" },
  abandoned: { label: "Abandonné", tone: "danger" },
};

export const PROJECT_COLORS = ["#3978F6", "#64A5FF", "#25C8C4", "#26B887", "#F5B942", "#EF6A70", "#8B6CF6", "#E36AC0", "#182235"];

export const PROJECT_ICONS = [
  "folder", "graduation-cap", "briefcase", "rocket", "dumbbell", "heart", "book-open", "code", "palette",
  "home", "music", "camera", "globe", "sparkles", "target", "leaf",
] as const;

export const DEFAULT_CATEGORIES = ["Travail", "Études", "Business", "Sport", "Santé", "Personnel", "Quotidien", "Apprentissage"];

export const FOCUS_AREAS = [
  { value: "Travail", label: "Projets professionnels", icon: "briefcase" },
  { value: "Études", label: "Études", icon: "graduation-cap" },
  { value: "Personnel", label: "Développement personnel", icon: "sparkles" },
  { value: "Business", label: "Création d'entreprise", icon: "rocket" },
  { value: "Sport", label: "Sport & forme", icon: "dumbbell" },
  { value: "Quotidien", label: "Responsabilités du quotidien", icon: "home" },
  { value: "Long terme", label: "Ambitions long terme", icon: "target" },
] as const;
