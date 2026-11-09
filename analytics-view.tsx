"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, CalendarRange, CheckCircle2, Flame, FolderKanban, Gauge, Lightbulb, Sun, Target, Trophy, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { HEALTH } from "@/components/goals/goal-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, useMilestonesByGoal, useProjects } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { useAllTasksLight } from "@/lib/data/tasks";
import { WEEKDAY_LABELS, monthBounds, orderedWeekdays, shiftDate, weekBounds, yearBounds } from "@/lib/dates";
import {
  PERIODS, averageDailyCompleted, bucketize, filterRange, generateInsights, goalHealth, goalProgress, granularityFor,
  groupStats, mostProductiveProject, mostProductiveWeekday, periodRange, streaks, tally, weekdayStats, type PeriodKey,
} from "@/lib/metrics";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { Legend, ProjectBars, SERIES } from "./chart-parts";
import { PerformanceChart, RateChart, WeekdayChart } from "./lazy-charts";

export function AnalyticsView() {
  const { today, weekStartsOn } = useCalendarContext();
  const { data: tasks = [], isLoading } = useAllTasksLight();
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
  const milestones = useMilestonesByGoal();
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const a = useMemo(() => {
    const range = periodRange(period, today);
    const inPeriod = filterRange(tasks, range.from, range.to);
    const g = granularityFor(period);
    const week = weekBounds(today, weekStartsOn);
    const month = monthBounds(today);
    const year = yearBounds(today);
    const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));
    const bestProject = mostProductiveProject(inPeriod);
    return {
      range,
      g,
      overall: tally(tasks),
      period: tally(inPeriod),
      week: tally(filterRange(tasks, week.start, today)),
      month: tally(filterRange(tasks, month.start, today)),
      year: tally(filterRange(tasks, year.start, today)),
      avgDaily: averageDailyCompleted(inPeriod),
      streak: streaks(tasks, today),
      bestWeekday: mostProductiveWeekday(inPeriod),
      bestProject: bestProject ? { ...bestProject, project: projects.find((p) => p.id === bestProject.id) } : null,
      evolution: bucketize(tasks, range.from, range.to, g, weekStartsOn),
      weeks: bucketize(tasks, weekBounds(shiftDate(today, -7 * 11), weekStartsOn).start, today, "week", weekStartsOn),
      months: bucketize(tasks, periodRange("12m", today).from, today, "month"),
      weekday: weekdayStats(inPeriod),
      projects: groupStats(inPeriod, (t) => t.project_id)
        .filter((s) => s.id)
        .map((s) => {
          const p = projects.find((x) => x.id === s.id);
          return { id: s.id!, name: p?.name ?? "Projet supprimé", color: p?.color ?? "var(--muted-foreground)", rate: s.rate, completed: s.completed, planned: s.planned, missed: s.missed };
        })
        .sort((x, y) => y.planned - x.planned),
      insights: generateInsights({ tasks, today, weekStartsOn, projectNames }),
    };
  }, [tasks, period, today, weekStartsOn, projects]);

  const goalRows = useMemo(
    () =>
      goals
        .filter((g) => !g.archived_at && g.status !== "abandoned")
        .map((g) => {
          const p = goalProgress(g, milestones.get(g.id) ?? []);
          return { goal: g, progress: p, health: goalHealth(g, p, today) };
        })
        .sort((x, y) => y.progress.percent - x.progress.percent),
    [goals, milestones, today],
  );

  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();
  const noData = !isLoading && tasks.length === 0;

  return (
    <div className="animate-slide-up space-y-6">
      <PageHeader
        title="Analyses"
        description="Vos performances calculées à partir de vos données réelles."
        actions={<Segmented ariaLabel="Période" size="md" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.key, label: p.short }))} />}
        className="mb-0 lg:mb-0"
      />

      {noData ? (
        <Card>
          <EmptyState icon={BarChart3} title="Pas encore assez de données" description="Planifiez et complétez quelques tâches : vos analyses apparaîtront automatiquement." />
        </Card>
      ) : (
        <>
          {/* Rates */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Taux global" hint="Toutes vos tâches depuis le début" icon={Gauge} loading={isLoading} value={formatPercent(a.overall.rate)}
              footer={`${a.overall.completed}/${a.overall.planned} tâches`} />
            <StatCard label="Cette semaine" icon={CalendarRange} loading={isLoading} value={formatPercent(a.week.rate)} footer={`${a.week.completed}/${a.week.planned} tâches`} />
            <StatCard label="Ce mois-ci" icon={CalendarRange} tone="accent" loading={isLoading} value={formatPercent(a.month.rate)} footer={`${a.month.completed}/${a.month.planned} tâches`} />
            <StatCard label="Cette année" icon={CalendarRange} tone="success" loading={isLoading} value={formatPercent(a.year.rate)} footer={`${a.year.completed}/${a.year.planned} tâches`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <CardHeader title="Évolution du taux d'accomplissement" description={periodLabel} />
              <CardBody>{isLoading ? <Skeleton className="h-60" /> : <RateChart buckets={a.evolution} granularity={a.g} />}</CardBody>
            </Card>
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Lightbulb className="size-4 text-warning" /> Enseignements</span>} description="Uniquement lorsque vos données le permettent" />
              <CardBody>
                {a.insights.length === 0 ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">Pas encore assez d&apos;historique pour tirer des conclusions fiables. Continuez à enregistrer vos journées.</p>
                ) : (
                  <ul className="space-y-3">
                    {a.insights.map((i) => {
                      const Icon = i.tone === "positive" ? TrendingUp : i.tone === "warning" ? TrendingDown : Lightbulb;
                      return (
                        <li key={i.id} className="flex gap-3 rounded-xl bg-surface-muted/60 p-3 text-[13px] leading-relaxed">
                          <Icon className={cn("mt-0.5 size-4 shrink-0", i.tone === "positive" ? "text-success" : i.tone === "warning" ? "text-danger" : "text-primary")} />
                          {i.text}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Indicators */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Accomplissements" hint={`Tâches accomplies · ${periodLabel}`} icon={CheckCircle2} tone="success" loading={isLoading} value={a.period.completed}
              footer={`${a.overall.completed} au total`} />
            <StatCard label="Tâches manquées" hint={`Tâches manquées · ${periodLabel}`} icon={XCircle} tone="danger" loading={isLoading} value={a.period.missed}
              footer={`${a.overall.missed} au total`} />
            <StatCard label="Productivité moyenne" hint="Tâches accomplies par jour avec au moins une tâche planifiée" icon={Sun} tone="warning" loading={isLoading}
              value={a.avgDaily === null ? "—" : formatNumber(a.avgDaily)} footer="tâches accomplies / jour actif" />
            <StatCard label="Séries" icon={Flame} tone="warning" loading={isLoading} value={<>{a.streak.current}<span className="ml-1 text-base font-medium text-muted-foreground">j</span></>}
              footer={<>Plus longue : <span className="font-medium text-foreground">{a.streak.longest} j</span></>} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Comparaison hebdomadaire" description="12 dernières semaines" />
              <CardBody>{isLoading ? <Skeleton className="h-60" /> : <PerformanceChart buckets={a.weeks} granularity="week" height={240} />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Accomplissements par mois" description="12 derniers mois" />
              <CardBody>{isLoading ? <Skeleton className="h-60" /> : <PerformanceChart buckets={a.months} granularity="month" height={240} series={["completed"]} />}</CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Accomplies vs manquées" description={periodLabel} />
              <CardBody>
                <CompletedVsMissed completed={a.period.completed} missed={a.period.missed} pending={a.period.pending} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Productivité par jour" description={a.bestWeekday ? `Meilleur jour : ${WEEKDAY_LABELS[a.bestWeekday.weekday].toLowerCase()}` : "Pas encore assez de données pour désigner un meilleur jour"} />
              <CardBody><WeekdayChart stats={a.weekday} best={a.bestWeekday} order={orderedWeekdays(weekStartsOn)} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Projet le plus productif" description={periodLabel} />
              <CardBody>
                {a.bestProject?.project ? (
                  <Link href={`/projects/${a.bestProject.id}`} className="block rounded-xl bg-surface-muted/60 p-4 transition hover:bg-surface-hover">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-warning" />{a.bestProject.project.name}</p>
                    <p className="mt-2 text-2xl font-semibold tabular">{a.bestProject.completed} <span className="text-sm font-normal text-muted-foreground">tâches accomplies</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatPercent(a.bestProject.rate)} de réussite sur {a.bestProject.planned} planifiées</p>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Au moins 5 tâches liées à un projet sont nécessaires sur la période.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><FolderKanban className="size-4 text-primary" /> Comparaison des projets</span>} description={`Taux d'accomplissement · ${periodLabel}`} />
              <CardBody>
                {a.projects.length === 0 ? <p className="text-sm text-muted-foreground">Aucune tâche liée à un projet sur cette période.</p> : <ProjectBars rows={a.projects} />}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Target className="size-4 text-accent" /> Progression des objectifs</span>} description="Objectifs actifs et atteints" />
              <CardBody>
                {goalRows.length === 0 ? <p className="text-sm text-muted-foreground">Aucun objectif.</p> : (
                  <ul className="space-y-3.5">
                    {goalRows.map(({ goal, progress, health }) => (
                      <li key={goal.id}>
                        <Link href={`/objectives/${goal.id}`} className="group block">
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                            <span className="truncate font-medium group-hover:text-primary">{goal.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {HEALTH[health].label} · <span className="font-semibold text-foreground tabular">{progress.percent} %</span>
                            </span>
                          </div>
                          <ProgressBar value={progress.percent} color={HEALTH[health].color} className="h-2" label={goal.title} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function CompletedVsMissed({ completed, missed, pending }: { completed: number; missed: number; pending: number }) {
  const total = completed + missed + pending;
  if (total === 0) return <p className="text-sm text-muted-foreground">Aucune tâche sur la période.</p>;
  const parts = [
    { key: "completed" as const, value: completed },
    { key: "missed" as const, value: missed },
    { key: "pending" as const, value: pending },
  ];
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img"
        aria-label={`${completed} accomplies, ${missed} manquées, ${pending} en attente`}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: SERIES[p.key].color }} title={`${SERIES[p.key].label} : ${p.value}`} />
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <div key={p.key}>
            <dt className="text-xs text-muted-foreground"><Legend items={[SERIES[p.key]]} /></dt>
            <dd className="mt-1 text-xl font-semibold tabular">{p.value}</dd>
            <dd className="text-xs text-muted-foreground tabular">{Math.round((p.value / total) * 100)} %</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
