"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import * as D from "@radix-ui/react-dialog";
import { CheckCircle2, Circle, FolderPlus, Loader2, Moon, Plus, Search, Sun, Target, XCircle } from "lucide-react";
import { useAppActions } from "./app-actions";
import { MAIN_NAV, SETTINGS_NAV } from "./nav";
import { useProjectMap, useProjects, useGoals } from "@/lib/data/entities";
import { useSearchTasks } from "@/lib/data/tasks";
import { formatDate } from "@/lib/dates";
import { ProjectIcon } from "@/components/projects/project-icon";

function useDebounced<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const itemClass =
  "flex cursor-default select-none items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground";

export function CommandMenu() {
  const router = useRouter();
  const { commandOpen, setCommandOpen, openTask, openProject, openGoal } = useAppActions();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const search = useSearchTasks(debounced);
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
  const projectMap = useProjectMap();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (!commandOpen) setQuery("");
  }, [commandOpen]);

  const run = (fn: () => void) => {
    setCommandOpen(false);
    // let the dialog close before opening another one
    setTimeout(fn, 10);
  };

  const showSearch = debounced.trim().length >= 2;

  return (
    <D.Root open={commandOpen} onOpenChange={setCommandOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[#0b1020]/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-modal data-[state=open]:animate-scale-in">
          <D.Title className="sr-only">Menu de commandes</D.Title>
          <D.Description className="sr-only">Naviguer, créer ou rechercher dans votre historique</D.Description>
          <Command label="Menu de commandes" shouldFilter={!showSearch} loop>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Rechercher une tâche, aller à une page, créer…"
                className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              {search.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">ESC</kbd>
            </div>
            <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2 scrollbar-thin">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                {showSearch && search.isFetching ? "Recherche…" : "Aucun résultat."}
              </Command.Empty>

              {showSearch && (search.data?.length ?? 0) > 0 && (
                <Command.Group heading="Historique" className={groupClass}>
                  {search.data!.map((t) => {
                    const p = t.project_id ? projectMap.get(t.project_id) : undefined;
                    const Icon = t.status === "completed" ? CheckCircle2 : t.status === "missed" ? XCircle : Circle;
                    return (
                      <Command.Item
                        key={t.id}
                        value={`task-${t.id}`}
                        className={itemClass}
                        onSelect={() => run(() => router.push(`/history?date=${t.scheduled_date}&task=${t.id}`))}
                      >
                        <Icon className={t.status === "completed" ? "!text-success" : t.status === "missed" ? "!text-danger" : ""} />
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        {p && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{p.name}</span>}
                        <span className="text-xs text-muted-foreground tabular">{formatDate(t.scheduled_date, "d MMM yy")}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {!showSearch && (
                <>
                  <Command.Group heading="Créer" className={groupClass}>
                    <Command.Item className={itemClass} onSelect={() => run(() => openTask())}>
                      <Plus /> Nouvelle tâche
                      <kbd className="ml-auto text-[11px] text-muted-foreground">N</kbd>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={() => run(() => openProject())}>
                      <FolderPlus /> Nouveau projet
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={() => run(() => openGoal())}>
                      <Target /> Nouvel objectif
                    </Command.Item>
                  </Command.Group>
                  <Command.Group heading="Navigation" className={groupClass}>
                    {[...MAIN_NAV, SETTINGS_NAV].map((n) => (
                      <Command.Item key={n.href} value={n.label} className={itemClass} onSelect={() => run(() => router.push(n.href))}>
                        <n.icon /> {n.label}
                        {n.shortcut && <kbd className="ml-auto text-[11px] text-muted-foreground">{n.shortcut}</kbd>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  {projects.filter((p) => !p.archived_at).length > 0 && (
                    <Command.Group heading="Projets" className={groupClass}>
                      {projects.filter((p) => !p.archived_at).map((p) => (
                        <Command.Item key={p.id} value={`projet ${p.name}`} className={itemClass} onSelect={() => run(() => router.push(`/projects/${p.id}`))}>
                          <ProjectIcon icon={p.icon} color={p.color} size="sm" /> {p.name}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {goals.filter((g) => !g.archived_at && g.status !== "achieved").length > 0 && (
                    <Command.Group heading="Objectifs" className={groupClass}>
                      {goals.filter((g) => !g.archived_at && g.status !== "achieved").slice(0, 8).map((g) => (
                        <Command.Item key={g.id} value={`objectif ${g.title}`} className={itemClass} onSelect={() => run(() => router.push(`/objectives/${g.id}`))}>
                          <Target /> {g.title}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  <Command.Group heading="Préférences" className={groupClass}>
                    <Command.Item className={itemClass} onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
                      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                      {resolvedTheme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
                    </Command.Item>
                  </Command.Group>
                </>
              )}
            </Command.List>
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span>Tapez au moins 2 caractères pour chercher dans l&apos;historique</span>
              <span className="hidden sm:inline">↑↓ naviguer · ↵ ouvrir</span>
            </div>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
