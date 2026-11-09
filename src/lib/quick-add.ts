import type { Priority } from "@/lib/types";

export interface QuickAddResult {
  title: string;
  category: string | null;
  priority: Priority | null;
  projectQuery: string | null;
}

/**
 * Parses the quick-add syntax:
 *   "Réviser chapitre 3 #Études @Université !!"
 * - `#mot`   → category
 * - `@mot`   → project (matched by name, case/accents-insensitive prefix)
 * - `!` `!!` `!!!` → priority medium / high / urgent ; `!low` → low
 */
export function parseQuickAdd(input: string): QuickAddResult {
  let category: string | null = null;
  let priority: Priority | null = null;
  let projectQuery: string | null = null;

  const tokens = input.trim().split(/\s+/);
  const rest: string[] = [];
  for (const tok of tokens) {
    if (/^#[\p{L}\p{N}_-]{1,40}$/u.test(tok) && !category) {
      category = tok.slice(1);
    } else if (/^@[\p{L}\p{N}_-]{1,80}$/u.test(tok) && !projectQuery) {
      projectQuery = tok.slice(1);
    } else if (/^!{1,3}$/.test(tok) && !priority) {
      priority = (["medium", "high", "urgent"] as const)[tok.length - 1];
    } else if (/^!low$/i.test(tok) && !priority) {
      priority = "low";
    } else {
      rest.push(tok);
    }
  }
  return { title: rest.join(" ").trim(), category, priority, projectQuery };
}

export function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function matchProject<T extends { id: string; name: string }>(projects: readonly T[], query: string | null): T | null {
  if (!query) return null;
  const q = normalize(query).replace(/[-_]/g, " ");
  return (
    projects.find((p) => normalize(p.name) === q) ??
    projects.find((p) => normalize(p.name).startsWith(q)) ??
    projects.find((p) => normalize(p.name).replace(/\s+/g, "").startsWith(q.replace(/\s+/g, ""))) ??
    null
  );
}
