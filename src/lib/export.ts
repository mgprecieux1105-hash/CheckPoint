"use client";

import { getSupabase } from "@/lib/supabase/client";
import { fetchAllPages } from "@/lib/data/fetch-all";

const TABLES = ["profiles", "projects", "goals", "milestones", "tasks", "daily_reflections"] as const;

export async function collectUserData() {
  const sb = getSupabase();
  const out: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    out[table] = await fetchAllPages((from, to) => sb.from(table).select("*").range(from, to));
  }
  return { exported_at: new Date().toISOString(), app: "CheckPoint", version: 1, ...out };
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
