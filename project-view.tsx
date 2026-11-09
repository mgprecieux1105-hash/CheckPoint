"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, FolderX, Gauge, ListTodo, Plus, Target, XCircle } from "lucide-react";
import { PerformanceChart, RateChart, WeekdayChart } from "@/components/analytics/lazy-charts";
import { StatCard } from "@/components/common/stat-card";
import { GoalCard } from "@/components/goals/goal-card";
import { HeatLegend, MonthCalendar, statsMap } from "@/components/history/calendar";
import { useAppActions } from "@/components/shell/app-actions";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskRow } from "@/components/tasks/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRIORITY_LABEL, PROJECT_STATUS } from "@/lib/constants";
import { useGoals, useMilestonesByGoal, useProjects } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { useProjectTasks } from "@/lib/data/tasks";
import { formatDate, monthBounds, orderedWeekdays, shiftDate, type ISODate } from "@/lib/dates";
import { bucketize, dailyStats, filterRange, groupStats, mostProductiveWeekday, periodRange, tally, weekdayStats } from "@/lib/metrics";
import type { TaskStatus } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import { ProjectActions, useArchiveProject } from "./project-actions";
import { ProjectIcon } from "./project-icon";

export function ProjectView({ id }: { id: string }) {
  const { openTask, openGoal, openProject } = useAppActions();
  const { today, weekStartsOn } = useCalendarContext();
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: tasks = [], isLoading } = useProjectTasks(id);
  const { data: goals = [] } = useGoals();
  const milestones = useMilestonesByGoal();
  const archive = useArchiveProject();
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [month, setMonth] = useState<ISODate>(monthBounds(today).start);
  const [selectedDay, setSelectedDay] = useState<ISODate | null>(null);

  const project = projects?.find((p) => p.id === id);

  const s = useMemo(() => {
    const total = tally(tasks);
    const r30 = periodRange("30d", today);
    const r90 = periodRange("90d", today);
    return {
      total,
      last30: bucketize(tasks, r30.from, r30.to, "day"),
      weekly: bucketize(tasks, r90.from, r90.to, "week", weekStartsOn),
      weekday: weekdayStats(filterRange(tasks, r90.from, today)),
      categories: groupStats(tasks, (t) => t.category).sort((a, b) => b.planned - a.planned),
      calendar: statsMap(dailyStats(tasks, shiftDate(monthBounds(month).start, -7), shiftDate(monthBounds(month).end, 7))),
    };
  }, [tasks, today, weekStartsOn, month]);

  if (projLoading) return <div className="space-y-4"><Skeleton className="h-16 w-80" /><Skeleton className="h-64" /></div>;
  if (!project) {
    return (
      <Card>
        <EmptyState icon={FolderX} title="Projet introuvable" description="Il a peut-être été supprimé."
          action={<Button asChild variant="secondary"><Link href="/projects">Retour aux projets</Link></Button>} />
      </Card>
    );
  }

  const status = PROJECT_STATUS[project.status];
  const projectGoals = goals.filter((g) => g.project_id === id);
  const upcoming = tasks
    .filter((t) => t.status === "pending" && (t.due_date ?? t.scheduled_date) >= today)
    .sort((a, b) => (a.due_date ?? a.scheduled_date).localeCompare(b.due_date ?? b.scheduled_date))
    .slice(0, 6);
  const filtered = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);
  const dayTasks = selectedDay ? tasks.filter((t) => t.scheduled_date === selectedDay) : [];

  return (
    <div className="animate-slide-up">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Projets
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <ProjectIcon icon={project.icon} color={project.color} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{project.name}</h1>
              <Badge tone={status.tone}>{status.label}</Badge>
              {project.is_demo && <Badge tone="outline">Démo</Badge>}
            </div>
            {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Priorité {PRIORITY_LABEL[project.priority].toLowerCase()}</span>
              {project.start_date && <span>Début {formatDate(project.start_date)}</span>}
              {project.target_date && <span>Cible {formatDate(project.target_date)}</span>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {project.archived_at ? (
            <Button variant="secondary" onClick={() => archive(project, false)}>Restaurer</Button>
          ) : (
            <Button onClick={() => openTask({ defaults: { project_id: id, scheduled_date: today } })}><Plus /> Tâche</Button>
          )}
          <Button variant="secondary" onClick={() => openProject(project)}>Modifier</Button>
          <ProjectActions project={project} redirectOnDelete variant="button" />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="tasks">Tâches <span className="ml-1 text-muted-foreground tabular">{tasks.length}</span></TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Taux d'accomplissement" icon={Gauge} loading={isLoading} value={formatPercent(s.total.rate)} footer={`${s.total.completed}/${s.total.planned}`} />
            <StatCard label="Tâches totales" icon={ListTodo} loading={isLoading} value={s.total.planned} />
            <StatCard label="Accomplies" icon={CheckCircle2} tone="success" loading={isLoading} value={s.total.completed} />
            <StatCard label="Manquées" icon={XCircle} tone="danger" loading={isLoading} value={s.total.missed} />
            <StatCard label="En attente" icon={CircleDashed} tone="warning" loading={isLoading} value={s.total.pending} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader title="Historique de performance" description="30 derniers jours" />
              <CardBody>
                {isLoading ? <Skeleton className="h-64" /> : <PerformanceChart buckets={s.last30} granularity="day" height={240} />}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Échéances à venir" />
              <CardBody className="px-2">
                {upcoming.length === 0 ? (
                  <EmptyState compact icon={CalendarClock} title="Rien à l'horizon" description="Aucune tâche en attente à venir." />
                ) : upcoming.map((t) => <TaskRow key={t.id} task={t} today={today} hideProject showDate />)}
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Objectifs associés" action={<Button variant="ghost" size="sm" onClick={() => openGoal(undefined, { project_id: id })}><Plus /> Objectif</Button>} />
            <CardBody>
              {projectGoals.length === 0 ? (
                <EmptyState compact icon={Target} title="Aucun objectif lié" description="Associez un objectif mesurable à ce projet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projectGoals.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.get(g.id)} today={today} />)}
                </div>
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 focus-visible:outline-none">
          {!project.archived_at && <QuickAdd date={today} projectId={id} />}
          <Card>
            <CardHeader
              title="Toutes les tâches"
              action={
                <Segmented ariaLabel="Filtrer par statut" value={statusFilter} onChange={setStatusFilter}
                  options={[{ value: "all", label: "Toutes" }, { value: "pending", label: "En attente" }, { value: "completed", label: "Accomplies" }, { value: "missed", label: "Manquées" }]} />
              }
            />
            <CardBody className="px-2">
              {isLoading ? <Skeleton className="mx-3 h-40" /> : filtered.length === 0 ? (
                <EmptyState compact icon={ListTodo} title="Aucune tâche" />
              ) : filtered.map((t) => <TaskRow key={t.id} task={t} today={today} hideProject showDate />)}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader
                title={<span className="capitalize">{formatDate(month, "MMMM yyyy")}</span>}
                action={
                  <div className="flex">
                    <Button variant="ghost" size="icon-sm" aria-label="Mois précédent" onClick={() => setMonth(monthBounds(shiftDate(month, -1)).start)}><ChevronLeft /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Mois suivant" onClick={() => setMonth(monthBounds(shiftDate(monthBounds(month).end, 1)).start)}><ChevronRight /></Button>
                  </div>
                }
              />
              <CardBody>
                <MonthCalendar month={month} stats={s.calendar} today={today} weekStartsOn={weekStartsOn} selected={selectedDay} onSelect={setSelectedDay} />
                <HeatLegend className="mt-4" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={selectedDay ? <span className="capitalize">{formatDate(selectedDay, "EEEE d MMMM")}</span> : "Sélectionnez un jour"} />
              <CardBody className="px-2">
                {!selectedDay ? (
                  <p className="px-3 text-sm text-muted-foreground">Cliquez sur une date pour voir les tâches du projet.</p>
                ) : dayTasks.length === 0 ? (
                  <p className="px-3 text-sm text-muted-foreground">Aucune tâche ce jour-là.</p>
                ) : dayTasks.map((t) => <TaskRow key={t.id} task={t} today={today} hideProject />)}
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6 focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Taux d'accomplissement hebdomadaire" description="90 derniers jours" />
              <CardBody>{s.total.planned ? <RateChart buckets={s.weekly} granularity="week" /> : <EmptyState compact icon={Gauge} title="Pas encore de données" />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Par jour de la semaine" description="90 derniers jours" />
              <CardBody>{s.total.planned ? <WeekdayChart stats={s.weekday} best={mostProductiveWeekday(filterRange(tasks, periodRange("90d", today).from, today))} order={orderedWeekdays(weekStartsOn)} /> : <EmptyState compact icon={Gauge} title="Pas encore de données" />}</CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Répartition par catégorie" />
            <CardBody>
              {s.categories.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Catégorie</th><th className="py-2 text-right font-medium">Planifiées</th>
                      <th className="py-2 text-right font-medium">Accomplies</th><th className="py-2 text-right font-medium">Manquées</th><th className="py-2 text-right font-medium">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.categories.map((c) => (
                      <tr key={c.id ?? "none"} className="border-b border-border last:border-0">
                        <td className="py-2.5">{c.id ?? <span className="text-muted-foreground">Sans catégorie</span>}</td>
                        <td className="py-2.5 text-right tabular">{c.planned}</td>
                        <td className="py-2.5 text-right tabular">{c.completed}</td>
                        <td className="py-2.5 text-right tabular">{c.missed}</td>
                        <td className="py-2.5 text-right font-medium tabular">{formatPercent(c.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
