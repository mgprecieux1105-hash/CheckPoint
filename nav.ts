import { BarChart3, CalendarCheck2, FolderKanban, History, LayoutDashboard, Settings, Target, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/overview", label: "Vue d'ensemble", icon: LayoutDashboard, shortcut: "G O" },
  { href: "/tracker", label: "Suivi du jour", icon: CalendarCheck2, shortcut: "G T" },
  { href: "/projects", label: "Projets", icon: FolderKanban, shortcut: "G P" },
  { href: "/objectives", label: "Objectifs", icon: Target, shortcut: "G B" },
  { href: "/history", label: "Historique", icon: History, shortcut: "G H" },
  { href: "/analytics", label: "Analyses", icon: BarChart3, shortcut: "G A" },
];

export const SETTINGS_NAV: NavItem = { href: "/settings", label: "Réglages", icon: Settings, shortcut: "G S" };

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
