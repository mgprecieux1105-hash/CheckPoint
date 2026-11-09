import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | null | undefined, empty = "—"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return empty;
  return `${Math.round(value)} %`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n > 1 ? plural : singular}`;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = String((err as { message: unknown }).message);
    if (m.includes("projects_user_name_unique")) return "Un projet porte déjà ce nom.";
    if (m.includes("daily_reflections_unique_day")) return "Une réflexion existe déjà pour ce jour.";
    if (m.includes("Failed to fetch")) return "Connexion impossible. Vérifiez votre réseau.";
    return m;
  }
  return "Une erreur inattendue est survenue.";
}
