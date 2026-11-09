"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleSlash, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { ProjectDot } from "@/components/projects/project-icon";
import { GOAL_TYPE_LABEL } from "@/lib/constants";
import { countdownLabel, formatDate, type ISODate } from "@/lib/dates";
import { goalHealth, goalProgress, type GoalHealth, type GoalProgress } from "@/lib/metrics";
import type { Goal, Milestone, Project } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export const HEALTH: Record<GoalHealth, { label: string; tone: "success" | "primary" | "warning" | "danger" | "neutral"; icon: typeof Clock; color: string }> = {
  achieved: { label: "Atteint", tone: "success", icon: CheckCircle2, color: "var(--success)" },
  on_track: { label: "En bonne voie", tone: "primary", icon: TrendingUp, color: "var(--primary)" },
  at_risk: { label: "En retard sur le rythme", tone: "warning", icon: AlertTriangle, color: "var(--warning)" },
  overdue: { label: "Échéance dépassée", tone: "danger", icon: CalendarClock, color: "var(--danger)" },
  not_started: { label: "Non commencé", tone: "neutral", icon: Clock, color: "var(--muted-foreground)" },
  abandoned: { label: "Abandonné", tone: "neutral", icon: CircleSlash, color: "var(--muted-foreground)" },
};

export function progressText(goal: Goal, p: GoalProgress) {
  if (goal.progress_mode === "milestones") return `${p.value}/${p.target} jalon${p.target > 1 ? "s" : ""}`;
  return `${formatNumber(p.value)} / ${formatNumber(p.target)}${goal.unit ? ` ${goal.unit}` : ""}`;
}

export function useGoalComputed(goal: Goal, milestones: Milestone[] | undefined, today: ISODate) {
  const progress = goalProgress(goal, milestones ?? []);
  const health = goalHealth(goal, progress, today);
  return { progress, health };
}

export function GoalCard({
  goal,
  milestones,
  project,
  today,
  compact,
}: {
  goal: Goal;
  milestones?: Milestone[];
  project?: Project;
  today: ISODate;
  compact?: boolean;
}) {
  const { progress, health } = useGoalComputed(goal, milestones, today);
  const h = HEALTH[health];
  const done = goal.status === "achieved" || goal.status === "abandoned";

  if (compact) {
    return (
      <Link href={`/objectives/${goal.id}`} className="block rounded-xl px-3 py-2.5 transition hover:bg-surface-hover">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium">{goal.title}</p>
          <span className="shrink-0 text-sm font-semibold tabular">{progress.percent} %</span>
        </div>
        <ProgressBar value={progress.percent} color={h.color} className="mt-2" label={goal.title} />
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{progressText(goal, progress)}</span>
          <span className={cn("shrink-0", health === "overdue" && "text-danger", health === "at_risk" && "text-warning")}>
            {done ? h.label : countdownLabel(goal.target_date, today)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/objectives/${goal.id}`} className="group block focus-visible:outline-none">
      <Card className="flex h-full flex-col p-5 transition group-hover:border-border-strong group-hover:shadow-pop group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="outline">{GOAL_TYPE_LABEL[goal.goal_type]}</Badge>
            {goal.is_demo && <Badge tone="outline">Démo</Badge>}
          </div>
          <Badge tone={h.tone}><h.icon /> {h.label}</Badge>
        </div>
        <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight">{goal.title}</h3>
        {project && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ProjectDot color={project.color} />{project.name}</p>
        )}
        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-2xl font-semibold tracking-tight tabular">{progress.percent} %</span>
            <span className="text-xs text-muted-foreground tabular">{progressText(goal, progress)}</span>
          </div>
          <ProgressBar value={progress.percent} color={h.color} className="h-2" label={`Progression de ${goal.title}`} />
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Échéance {formatDate(goal.target_date, "d MMM yyyy")}</span>
            {!done && (
              <span className={cn(health === "overdue" && "font-medium text-danger")}>{countdownLabel(goal.target_date, today)}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
