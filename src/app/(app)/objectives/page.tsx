"use client";

import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { GoalCard } from "@/components/goals/goal-card";
import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { GOAL_TYPES, PRIORITY_ORDER } from "@/lib/constants";
import { useGoals, useMilestonesByGoal, useProjectMap } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import type { GoalType } from "@/lib/types";

type StatusView = "active" | "achieved" | "archived";

export default function ObjectivesPage() {
  const { openGoal } = useAppActions();
  const { today } = useCalendarContext();
  const { data: goals, isLoading } = useGoals();
  const milestones = useMilestonesByGoal();
  const projects = useProjectMap();
  const [type, setType] = useState<"all" | GoalType>("all");
  const [view, setView] = useState<StatusView>("active");

  const list = useMemo(() => {
    return (goals ?? [])
      .filter((g) => (type === "all" ? true : g.goal_type === type))
      .filter((g) => {
        if (view === "archived") return !!g.archived_at;
        if (g.archived_at) return false;
        return view === "achieved" ? g.status === "achieved" || g.status === "abandoned" : g.status === "in_progress" || g.status === "not_started";
      })
      .sort((a, b) => a.target_date.localeCompare(b.target_date) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [goals, type, view]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const g of goals ?? []) {
      if (g.archived_at || g.status === "achieved" || g.status === "abandoned") continue;
      c.all++;
      c[g.goal_type] = (c[g.goal_type] ?? 0) + 1;
    }
    return c;
  }, [goals]);

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Objectifs"
        description="Des objectifs mesurables à chaque horizon : semaine, mois, année et au-delà."
        actions={<Button onClick={() => openGoal()}><Plus /> Nouvel objectif</Button>}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented ariaLabel="Horizon" size="md" value={type} onChange={setType} className="max-w-full overflow-x-auto"
          options={[{ value: "all" as const, label: `Tous${counts.all ? ` · ${counts.all}` : ""}` }, ...GOAL_TYPES.map((t) => ({ value: t.value, label: `${t.short}${counts[t.value] ? ` · ${counts[t.value]}` : ""}` }))]} />
        <Segmented ariaLabel="Statut" value={view} onChange={setView}
          options={[{ value: "active", label: "En cours" }, { value: "achieved", label: "Terminés" }, { value: "archived", label: "Archivés" }]} />
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={Target}
            title={view === "active" ? "Aucun objectif en cours" : view === "achieved" ? "Aucun objectif terminé" : "Aucun objectif archivé"}
            description={view === "active" ? "Définissez une cible chiffrée ou des jalons pour mesurer votre progression." : undefined}
            action={view === "active" ? <Button onClick={() => openGoal()}><Plus /> Créer un objectif</Button> : undefined} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g} milestones={milestones.get(g.id)} today={today} project={g.project_id ? projects.get(g.project_id) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
