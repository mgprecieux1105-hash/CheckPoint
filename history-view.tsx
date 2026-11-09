"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarSearch, ChevronLeft, ChevronRight, FilterX, Search, X } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ReflectionCard } from "@/components/tasks/reflection-card";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, useProjects } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { useAllTasksLight, useSearchTasks, useTasksForDay, useTasksInRange } from "@/lib/data/tasks";
import { dateRange, formatDate, monthBounds, shiftDate, weekBounds, type ISODate } from "@/lib/dates";
import { dailyStats, dayLevel, delta, filterRange, previousRange, tally, type MetricTask } from "@/lib/metrics";
import type { Task, TaskStatus } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";
import { HeatLegend, MonthCalendar, YearHeatmap, levelClass, statsMap } from "./calendar";

type View = "month" | "week" | "year" | "list";
const VIEWS: View[] = ["month", "week", "year", "list"];
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

interface Filters {
  project: string;
  category: string;
  goal: string;
  status: "" | TaskStatus;
  from: string;
  to: string;
}

function matches(t: MetricTask, f: Filters) {
  if (f.project && (f.project === "none" ? t.project_id : t.project_id !== f.project)) return false;
  if (f.category && (t.category ?? "") !== f.category) return false;
  if (f.goal && t.goal_id !== f.goal) return false;
  return true;
}

export function HistoryView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { today, weekStartsOn } = useCalendarContext();

  const view: View = VIEWS.includes(params.get("view") as View) ? (params.get("view") as View) : "month";
  const selected: ISODate | null = isDate(params.get("date")) ? params.get("date") : null;
  const focusTask = params.get("task");
  const [anchor, setAnchor] = useState<ISODate>(selected ?? today);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ project: "", category: "", goal: "", status: "", from: shiftDate(today, -29), to: today });

  useEffect(() => {
    if (selected) setAnchor(selected);
  }, [selected]);

  const setParams = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const { data: all = [], isLoading } = useAllTasksLight();
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
  const categories = useMemo(() => [...new Set(all.map((t) => t.category).filter(Boolean) as string[])].sort(), [all]);

  const filtered = useMemo(() => all.filter((t) => matches(t, filters)), [all, filters]);
  const activeFilters = !!(filters.project || filters.category || filters.goal || filters.status);

  const calendarStats = useMemo(() => {
    let from: ISODate, to: ISODate;
    if (view === "year") {
      from = `${anchor.slice(0, 4)}-01-01`;
      to = `${anchor.slice(0, 4)}-12-31`;
    } else {
      const m = monthBounds(anchor);
      from = shiftDate(m.start, -7);
      to = shiftDate(m.end, 7);
    }
    return statsMap(dailyStats(filtered, from, to));
  }, [filtered, anchor, view]);

  const period = useMemo(() => {
    if (view === "year") return { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31` };
    if (view === "week") {
      const w = weekBounds(anchor, weekStartsOn);
      return { from: w.start, to: w.end };
    }
    if (view === "list") return { from: filters.from, to: filters.to };
    const m = monthBounds(anchor);
    return { from: m.start, to: m.end };
  }, [view, anchor, weekStartsOn, filters.from, filters.to]);

  const comparison = useMemo(() => {
    const to = period.to > today ? today : period.to;
    if (to < period.from) return null;
    const cur = tally(filterRange(filtered, period.from, to));
    const prevRange = previousRange(period.from, to);
    const prev = tally(filterRange(filtered, prevRange.from, prevRange.to));
    return { cur, prev, completed: delta(cur.completed, prev.completed) };
  }, [filtered, period, today]);

  const move = (dir: -1 | 1) => {
    if (view === "year") setAnchor(`${Number(anchor.slice(0, 4)) + dir}-01-01`);
    else if (view === "week") setAnchor(shiftDate(anchor, 7 * dir));
    else setAnchor(dir < 0 ? monthBounds(shiftDate(monthBounds(anchor).start, -1)).start : shiftDate(monthBounds(anchor).end, 1));
  };

  const periodTitle =
    view === "year" ? anchor.slice(0, 4)
      : view === "week" ? `Semaine du ${formatDate(period.from, "d MMM")} au ${formatDate(period.to, "d MMM yyyy")}`
        : view === "list" ? `Du ${formatDate(filters.from)} au ${formatDate(filters.to)}`
          : formatDate(anchor, "MMMM yyyy");

  const selectDay = (d: ISODate) => setParams({ date: d, task: null });
  const searching = query.trim().length >= 2;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Historique"
        description="Tout ce que vous avez planifié, accompli ou manqué, jour après jour."
        actions={
          <Segmented ariaLabel="Vue" size="md" value={view} onChange={(v) => setParams({ view: v })}
            options={[{ value: "month", label: "Mois" }, { value: "week", label: "Semaine" }, { value: "year", label: "Année" }, { value: "list", label: "Liste" }]} />
        }
      />

      {/* Search & filters */}
      <Card className="mb-6 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Rechercher dans l'historique" placeholder="Rechercher par titre, description ou projet…" value={query}
              onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            {query && (
              <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <NativeSelect aria-label="Projet" value={filters.project} onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))} className="sm:w-40">
              <option value="">Tous les projets</option>
              <option value="none">Sans projet</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Catégorie" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="sm:w-36">
              <option value="">Catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Objectif" value={filters.goal} onChange={(e) => setFilters((f) => ({ ...f, goal: e.target.value }))} className="sm:w-40">
              <option value="">Objectifs</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Statut" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))} className="sm:w-36">
              <option value="">Tous statuts</option>
              <option value="completed">Accomplies</option>
              <option value="missed">Manquées</option>
              <option value="pending">En attente</option>
            </NativeSelect>
            {activeFilters && (
              <Button variant="ghost" onClick={() => setFilters((f) => ({ ...f, project: "", category: "", goal: "", status: "" }))}>
                <FilterX /> Réinitialiser
              </Button>
            )}
          </div>
        </div>
        {view === "list" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[13px] text-muted-foreground">
            Période
            <Input type="date" aria-label="Date de début" value={filters.from} max={filters.to}
              onChange={(e) => e.target.value && setFilters((f) => ({ ...f, from: e.target.value }))} className="h-8 w-auto" />
            →
            <Input type="date" aria-label="Date de fin" value={filters.to} min={filters.from}
              onChange={(e) => e.target.value && setFilters((f) => ({ ...f, to: e.target.value }))} className="h-8 w-auto" />
            {[7, 30, 90, 365].map((n) => (
              <Button key={n} variant="ghost" size="sm" onClick={() => setFilters((f) => ({ ...f, from: shiftDate(today, -(n - 1)), to: today }))}>
                {n === 365 ? "1 an" : `${n} j`}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {searching ? (
        <SearchResults query={query} today={today} filters={filters} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader
                title={<span className="capitalize">{periodTitle}</span>}
                description={comparison && comparison.cur.planned > 0 ? (
                  <span>
                    {comparison.cur.completed}/{comparison.cur.planned} accomplies · {comparison.cur.missed} manquées · {formatPercent(comparison.cur.rate)}
                    {comparison.prev.planned > 0 && comparison.cur.rate !== null && comparison.prev.rate !== null && (
                      <span className={cn("ml-2 font-medium", comparison.cur.rate >= comparison.prev.rate ? "text-success" : "text-danger")}>
                        {comparison.cur.rate >= comparison.prev.rate ? "+" : ""}{Math.round(comparison.cur.rate - comparison.prev.rate)} pts vs période précédente
                      </span>
                    )}
                  </span>
                ) : "Aucune tâche sur cette période"}
                action={view !== "list" ? (
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon-sm" aria-label="Période précédente" onClick={() => move(-1)}><ChevronLeft /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setAnchor(today)}>Aujourd&apos;hui</Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Période suivante" onClick={() => move(1)}><ChevronRight /></Button>
                  </div>
                ) : undefined}
              />
              <CardBody>
                {isLoading ? <Skeleton className="h-80" /> : view === "month" ? (
                  <MonthCalendar month={anchor} stats={calendarStats} today={today} weekStartsOn={weekStartsOn} selected={selected} onSelect={selectDay} />
                ) : view === "year" ? (
                  <YearHeatmap year={Number(anchor.slice(0, 4))} stats={calendarStats} today={today} weekStartsOn={weekStartsOn} onSelect={selectDay} />
                ) : view === "week" ? (
                  <WeekStrip from={period.from} stats={calendarStats} today={today} selected={selected} onSelect={selectDay} />
                ) : (
                  <RangeList from={filters.from} to={filters.to} filters={filters} today={today} />
                )}
                {view !== "list" && <HeatLegend className="mt-5" />}
              </CardBody>
            </Card>
            {view === "week" && <WeekTasks from={period.from} to={period.to} filters={filters} today={today} />}
          </div>

          <div className="space-y-6">
            {selected ? (
              <DayDetail date={selected} today={today} filters={filters} focusTask={focusTask} onClose={() => setParams({ date: null, task: null })} />
            ) : (
              <Card>
                <EmptyState icon={CalendarSearch} title="Choisissez un jour" description="Cliquez sur une date du calendrier pour revoir ses tâches et sa réflexion." />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function applyFilters(tasks: Task[], f: Filters) {
  return tasks.filter((t) => matches(t, f) && (!f.status || t.status === f.status));
}

function DayDetail({ date, today, filters, focusTask, onClose }: { date: ISODate; today: ISODate; filters: Filters; focusTask: string | null; onClose: () => void }) {
  const { data = [], isLoading } = useTasksForDay(date);
  const tasks = applyFilters(data, filters);
  const s = tally(tasks);

  useEffect(() => {
    if (focusTask && !isLoading) document.getElementById(`task-${focusTask}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusTask, isLoading]);

  return (
    <>
      <Card>
        <CardHeader
          title={<span className="capitalize">{formatDate(date, "EEEE d MMMM yyyy")}</span>}
          description={s.planned ? `${s.completed}/${s.planned} accomplies · ${s.missed} manquée${s.missed > 1 ? "s" : ""} · ${formatPercent(s.rate)}` : "Aucune tâche"}
          action={<Button variant="ghost" size="icon-sm" aria-label="Fermer" onClick={onClose}><X /></Button>}
        />
        <CardBody className="px-2">
          {isLoading ? <Skeleton className="mx-3 h-32" /> : tasks.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-muted-foreground">Aucune tâche enregistrée{filters.project || filters.category || filters.goal || filters.status ? " avec ces filtres" : ""}.</p>
          ) : tasks.map((t) => <TaskRow key={t.id} task={t} today={today} highlighted={t.id === focusTask} />)}
          <div className="px-3 pt-2">
            <Button asChild variant="soft" size="sm" className="w-full">
              <Link href={`/tracker?date=${date}`}>Ouvrir dans le suivi du jour <ArrowRight /></Link>
            </Button>
          </div>
        </CardBody>
      </Card>
      <ReflectionCard date={date} readOnly />
    </>
  );
}

function WeekStrip({ from, stats, today, selected, onSelect }: {
  from: ISODate; stats: Map<ISODate, ReturnType<typeof tally>>; today: ISODate; selected: ISODate | null; onSelect: (d: ISODate) => void;
}) {
  const days = dateRange(from, shiftDate(from, 6));
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const s = stats.get(d) ?? { planned: 0, completed: 0, missed: 0, pending: 0, rate: null };
        const level = dayLevel(s, d, today);
        return (
          <button key={d} type="button" onClick={() => onSelect(d)} aria-pressed={selected === d}
            className={cn("flex flex-col items-center gap-2 rounded-xl border border-border p-2 transition hover:border-border-strong sm:p-3",
              selected === d && "border-foreground", d === today && "ring-2 ring-primary/40")}>
            <span className="text-[11px] font-medium capitalize text-muted-foreground">{formatDate(d, "EEE")}</span>
            <span className={cn("flex size-9 items-center justify-center rounded-lg text-sm font-semibold tabular sm:size-11", levelClass(level))}>{Number(d.slice(8))}</span>
            <span className="text-[11px] tabular text-muted-foreground">{s.planned ? `${s.completed}/${s.planned}` : "—"}</span>
          </button>
        );
      })}
    </div>
  );
}

function WeekTasks({ from, to, filters, today }: { from: ISODate; to: ISODate; filters: Filters; today: ISODate }) {
  const { data = [], isLoading } = useTasksInRange(from, to);
  const tasks = applyFilters(data, filters);
  return (
    <Card>
      <CardHeader title="Tâches de la semaine" description={`${tasks.length} tâche${tasks.length > 1 ? "s" : ""}`} />
      <CardBody className="px-2">
        {isLoading ? <Skeleton className="mx-3 h-32" /> : <GroupedByDay tasks={tasks} today={today} />}
      </CardBody>
    </Card>
  );
}

function RangeList({ from, to, filters, today }: { from: ISODate; to: ISODate; filters: Filters; today: ISODate }) {
  const { data = [], isLoading } = useTasksInRange(from, to);
  const tasks = applyFilters(data, filters);
  if (isLoading) return <Skeleton className="h-64" />;
  return <GroupedByDay tasks={tasks} today={today} />;
}

function GroupedByDay({ tasks, today }: { tasks: Task[]; today: ISODate }) {
  const groups = useMemo(() => {
    const m = new Map<ISODate, Task[]>();
    for (const t of tasks) {
      const l = m.get(t.scheduled_date);
      if (l) l.push(t);
      else m.set(t.scheduled_date, [t]);
    }
    return [...m.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [tasks]);
  if (groups.length === 0) return <EmptyState compact icon={CalendarSearch} title="Aucune tâche" description="Rien ne correspond à cette période ou à ces filtres." />;
  return (
    <div className="space-y-4">
      {groups.map(([d, list]) => {
        const s = tally(list);
        return (
          <section key={d}>
            <div className="sticky top-16 z-[1] flex items-center justify-between bg-surface/95 px-3 py-1.5 backdrop-blur">
              <h3 className="text-xs font-semibold capitalize text-subtle-foreground">{formatDate(d, "EEEE d MMMM yyyy")}</h3>
              <span className="text-xs tabular text-muted-foreground">{s.completed}/{s.planned} · {formatPercent(s.rate)}</span>
            </div>
            {list.map((t) => <TaskRow key={t.id} task={t} today={today} />)}
          </section>
        );
      })}
    </div>
  );
}

function SearchResults({ query, today, filters }: { query: string; today: ISODate; filters: Filters }) {
  const { data = [], isFetching, isError } = useSearchTasks(query);
  const tasks = applyFilters(data, filters);
  return (
    <Card>
      <CardHeader title={`Résultats pour « ${query.trim()} »`} description={isFetching ? "Recherche…" : `${tasks.length} résultat${tasks.length > 1 ? "s" : ""}`} />
      <CardBody className="px-2">
        {isError ? <p className="px-3 text-sm text-danger">La recherche a échoué.</p> : isFetching && data.length === 0 ? (
          <Skeleton className="mx-3 h-32" />
        ) : tasks.length === 0 ? (
          <EmptyState compact icon={Search} title="Aucun résultat" description="Essayez un autre mot-clé ou retirez des filtres." />
        ) : tasks.map((t) => <TaskRow key={t.id} task={t} today={today} showDate />)}
      </CardBody>
    </Card>
  );
}
