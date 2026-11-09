"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Flame, Gauge, Sparkles, Target, X } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { PerformanceChart } from "@/components/analytics/lazy-charts";
import { GoalCard } from "@/components/goals/goal-card";
import { HeatLegend, MonthCalendar, statsMap } from "@/components/history/calendar";
import { useAppActions } from "@/components/shell/app-actions";
import { ProjectDot } from "@/components/projects/project-icon";
import { StatusBadge } from "@/components/tasks/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoWorkspace, useGoals, useMilestonesByGoal, useProjectMap } from "@/lib/data/entities";
import { useCalendarContext, useProfile } from "@/lib/data/profile";
import { useAllTasksLight, useRecentTasks } from "@/lib/data/tasks";
import { formatDate, formatLongDate, monthBounds, shiftDate, type ISODate } from "@/lib/dates";
import {
  PERIODS, bucketize, dailyStats, delta, filterRange, granularityFor, periodRange, previousRange, streaks, tally, type PeriodKey,
} from "@/lib/metrics";
import { PRIORITY_ORDER } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone }).format(new Date()));
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function OverviewView() {
  const router = useRouter();
  const { openTask, openGoal } = useAppActions();
  const { data: profile } = useProfile();
  const { today, timeZone, weekStartsOn } = useCalendarContext();
  const { data: all, isLoading } = useAllTasksLight();
  const { data: recent, isLoading: recentLoading } = useRecentTasks(today, 7);
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const milestones = useMilestonesByGoal();
  const projects = useProjectMap();
  const { clear } = useDemoWorkspace();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [month, setMonth] = useState<ISODate>(monthBounds(today).start);

  const tasks = useMemo(() => all ?? [], [all]);
  const m = useMemo(() => {
    const range = periodRange(period, today);
    const prev = previousRange(range.from, range.to);
    const cur = tally(filterRange(tasks, range.from, range.to));
    const before = tally(filterRange(tasks, prev.from, prev.to));
    const g = granularityFor(period);
    return {
      cur,
      before,
      completedDelta: delta(cur.completed, before.completed),
      rateDiff: cur.rate !== null && before.rate !== null ? Math.round(cur.rate - before.rate) : null,
      streak: streaks(tasks, today),
      todayStats: tally(filterRange(tasks, today, today)),
      buckets: bucketize(tasks, range.from, range.to, g, weekStartsOn),
      granularity: g,
    };
  }, [tasks, period, today, weekStartsOn]);

  const calendarStats = useMemo(() => {
    const b = monthBounds(month);
    return statsMap(dailyStats(tasks, shiftDate(b.start, -7), shiftDate(b.end, 7)));
  }, [tasks, month]);

  const activeGoals = goals.filter((g) => !g.archived_at && (g.status === "in_progress" || g.status === "not_started"));
  const achievedGoals = goals.filter((g) => g.status === "achieved");
  const topGoals = [...activeGoals]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.target_date.localeCompare(b.target_date))
    .slice(0, 4);
  const hasDemo = [...projects.values()].some((p) => p.is_demo) || goals.some((g) => g.is_demo);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  const message = (() => {
    const t = m.todayStats;
    if (isLoading) return "Chargement de votre journée…";
    if (t.planned === 0) return "Rien n'est encore planifié aujourd'hui. Par quoi commencez-vous ?";
    if (t.pending === 0) return `Journée bouclée : ${t.completed} tâche${t.completed > 1 ? "s" : ""} accomplie${t.completed > 1 ? "s" : ""} sur ${t.planned}.`;
    return `${t.completed} sur ${t.planned} accomplie${t.completed > 1 ? "s" : ""} aujourd'hui, encore ${t.pending} à traiter.`;
  })();

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="animate-slide-up space-y-6">
      <PageHeader
        eyebrow={formatLongDate(today)}
        title={`${greeting(timeZone)}${firstName ? `, ${firstName}` : ""}`}
        description={message}
        actions={<Segmented ariaLabel="Période" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.key, label: p.short }))} />}
        className="mb-0 lg:mb-0"
      />

      {profile && !profile.onboarding_completed_at && (
        <Card className="flex flex-col gap-3 border-primary/25 bg-primary-soft/50 p-4 sm:flex-row sm:items-center">
          <Sparkles className="size-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Terminez la configuration de votre espace</p>
            <p className="text-[13px] text-muted-foreground">Premier projet, premier objectif et tâches du jour : 2 minutes suffisent.</p>
          </div>
          <Button asChild size="sm"><Link href="/onboarding">Continuer <ArrowRight /></Link></Button>
        </Card>
      )}
      {hasDemo && (
        <Card className="flex flex-col gap-3 border-warning/40 bg-warning-soft/60 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[13px]">
            <span className="font-medium">Espace de démonstration actif.</span>{" "}
            <span className="text-muted-foreground">Les éléments marqués « Démo » sont des exemples, ils sont inclus dans les statistiques.</span>
          </p>
          <Button size="sm" variant="secondary" loading={clear.isPending} onClick={() => clear.mutate()}>
            <X /> Retirer les données de démo
          </Button>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Accomplissements"
          hint={`Tâches accomplies sur les ${periodLabel}`}
          icon={CheckCircle2}
          tone="success"
          loading={isLoading}
          value={m.cur.completed}
          trend={m.before.planned > 0 ? { diff: m.completedDelta.diff, label: `${Math.abs(m.completedDelta.diff)}` } : null}
          footer={m.before.planned > 0 ? "vs période précédente" : "Pas encore de période de comparaison"}
        />
        <StatCard
          label="Taux d'accomplissement"
          hint="Tâches accomplies ÷ tâches planifiées. Les tâches en attente ne comptent pas comme accomplies."
          icon={Gauge}
          tone="primary"
          loading={isLoading}
          value={formatPercent(m.cur.rate)}
          visual={<ProgressRing value={m.cur.rate} size={40} stroke={5} />}
          trend={m.rateDiff !== null ? { diff: m.rateDiff, label: `${Math.abs(m.rateDiff)} pts` } : null}
          footer={m.cur.planned > 0 ? `${m.cur.completed}/${m.cur.planned} planifiées` : "Aucune tâche planifiée"}
        />
        <StatCard
          label="Série en cours"
          hint="Jours consécutifs avec au moins une tâche accomplie. Aujourd'hui ne casse pas la série tant que la journée n'est pas finie."
          icon={Flame}
          tone="warning"
          loading={isLoading}
          value={<>{m.streak.current}<span className="ml-1 text-base font-medium text-muted-foreground">j</span></>}
          footer={<>Record : <span className="font-medium text-foreground">{m.streak.longest} j</span>{!m.streak.todayActive && m.streak.current > 0 && " · accomplissez une tâche pour la prolonger"}</>}
        />
        <StatCard
          label="Objectifs actifs"
          hint="Objectifs non commencés ou en cours, non archivés"
          icon={Target}
          tone="accent"
          loading={goalsLoading}
          value={activeGoals.length}
          footer={<><span className="font-medium text-foreground">{achievedGoals.length}</span> atteint{achievedGoals.length > 1 ? "s" : ""} au total</>}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Performance quotidienne" description={`Tâches accomplies, manquées et en attente · ${periodLabel}`}
            action={<Button asChild variant="ghost" size="sm"><Link href="/analytics">Analyses <ArrowRight /></Link></Button>} />
          <CardBody>
            {isLoading ? <Skeleton className="h-[290px]" /> : m.cur.planned === 0 ? (
              <EmptyState icon={Gauge} title="Pas encore de données" description="Vos statistiques apparaîtront dès vos premières tâches."
                action={<Button size="sm" onClick={() => openTask()}>Ajouter une tâche</Button>} />
            ) : (
              <PerformanceChart buckets={m.buckets} granularity={m.granularity}
                onSelect={(b) => router.push(m.granularity === "day" ? `/history?date=${b.start}` : `/history?view=month&date=${b.start}`)} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Calendrier"
            description={<span className="capitalize">{formatDate(month, "MMMM yyyy")}</span>}
            action={
              <div className="flex">
                <Button variant="ghost" size="icon-sm" aria-label="Mois précédent" onClick={() => setMonth(monthBounds(shiftDate(month, -1)).start)}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Mois suivant" onClick={() => setMonth(monthBounds(shiftDate(monthBounds(month).end, 1)).start)}><ChevronRight /></Button>
              </div>
            }
          />
          <CardBody>
            <MonthCalendar compact month={month} stats={calendarStats} today={today} weekStartsOn={weekStartsOn}
              onSelect={(d) => router.push(`/history?date=${d}`)} />
            <HeatLegend className="mt-4" />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Activité récente" description="Dernières tâches enregistrées ou mises à jour"
            action={<Button asChild variant="ghost" size="sm"><Link href="/history">Historique <ArrowRight /></Link></Button>} />
          <CardBody className="px-2">
            {recentLoading ? (
              <div className="space-y-2 px-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : !recent?.length ? (
              <EmptyState compact icon={CheckCircle2} title="Aucune activité" description="Ajoutez votre première tâche du jour." />
            ) : (
              <ul>
                {recent.map((t) => {
                  const p = t.project_id ? projects.get(t.project_id) : undefined;
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => openTask({ task: t })}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-hover">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{t.title}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
                            {p && <span className="inline-flex items-center gap-1.5"><ProjectDot color={p.color} />{p.name}</span>}
                            {t.category && <span>#{t.category}</span>}
                            <span className="tabular">{formatDate(t.scheduled_date, "d MMM")}</span>
                          </span>
                        </span>
                        <StatusBadge status={t.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Progression des objectifs" description="Vos objectifs prioritaires en cours"
            action={<Button asChild variant="ghost" size="sm"><Link href="/objectives">Tous <ArrowRight /></Link></Button>} />
          <CardBody className="px-2">
            {goalsLoading ? (
              <div className="space-y-2 px-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : topGoals.length === 0 ? (
              <EmptyState compact icon={Target} title="Aucun objectif actif" description="Fixez-vous un objectif mesurable pour suivre votre progression."
                action={<Button size="sm" onClick={() => openGoal()}>Créer un objectif</Button>} />
            ) : (
              <div className="space-y-1">
                {topGoals.map((g) => (
                  <GoalCard key={g.id} compact goal={g} milestones={milestones.get(g.id)} today={today}
                    project={g.project_id ? projects.get(g.project_id) : undefined} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
