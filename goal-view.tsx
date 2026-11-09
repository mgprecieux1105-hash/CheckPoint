"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Archive, ArchiveRestore, ArrowLeft, Check, CircleSlash, Flag, ListTodo, Minus, MoreHorizontal, Pencil, Plus, RotateCcw, Target, Trash2, Trophy, X,
} from "lucide-react";
import { useAppActions } from "@/components/shell/app-actions";
import { ProjectIcon } from "@/components/projects/project-icon";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskRow } from "@/components/tasks/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GOAL_STATUS, GOAL_TYPE_LABEL, PRIORITY_LABEL } from "@/lib/constants";
import { useGoalMutations, useGoals, useMilestoneMutations, useMilestonesByGoal, useProjectMap } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { useGoalTasks } from "@/lib/data/tasks";
import { countdownLabel, formatDate } from "@/lib/dates";
import { goalTargetReached, tally } from "@/lib/metrics";
import type { Goal } from "@/lib/types";
import { cn, errorMessage, formatNumber, formatPercent } from "@/lib/utils";
import { HEALTH, progressText, useGoalComputed } from "./goal-card";

export function GoalView({ id }: { id: string }) {
  const { data: goals, isLoading } = useGoals();
  const goal = goals?.find((g) => g.id === id);
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-16 w-96" /><Skeleton className="h-64" /></div>;
  if (!goal) {
    return (
      <Card>
        <EmptyState icon={Target} title="Objectif introuvable" description="Il a peut-être été supprimé."
          action={<Button asChild variant="secondary"><Link href="/objectives">Retour aux objectifs</Link></Button>} />
      </Card>
    );
  }
  return <GoalDetail goal={goal} />;
}

function GoalDetail({ goal }: { goal: Goal }) {
  const router = useRouter();
  const { openGoal } = useAppActions();
  const { today } = useCalendarContext();
  const milestonesMap = useMilestonesByGoal();
  const milestones = milestonesMap.get(goal.id) ?? [];
  const projects = useProjectMap();
  const project = goal.project_id ? projects.get(goal.project_id) : undefined;
  const { data: tasks = [], isLoading: tasksLoading } = useGoalTasks(goal.id);
  const { update, remove } = useGoalMutations();
  const ms = useMilestoneMutations();
  const { progress, health } = useGoalComputed(goal, milestones, today);
  const h = HEALTH[health];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newMilestone, setNewMilestone] = useState("");
  const [valueInput, setValueInput] = useState<string>("");
  const taskStats = tally(tasks);
  const closed = goal.status === "achieved" || goal.status === "abandoned";

  const patch = (p: Partial<Goal>, success?: string) =>
    update.mutate({ id: goal.id, patch: p }, {
      onSuccess: () => success && toast.success(success),
      onError: (e) => toast.error(errorMessage(e)),
    });

  const setValue = (v: number) => {
    const value = Math.max(0, Math.round(v * 100) / 100);
    patch({ current_value: value, status: goal.status === "not_started" && value > 0 ? "in_progress" : goal.status });
  };

  const step = Number(goal.target_value) >= 20 ? Math.max(1, Math.round(Number(goal.target_value) / 20)) : 1;

  return (
    <div className="animate-slide-up">
      <Link href="/objectives" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Objectifs
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="outline">{GOAL_TYPE_LABEL[goal.goal_type]}</Badge>
            <Badge tone={GOAL_STATUS[goal.status].tone}>{GOAL_STATUS[goal.status].label}</Badge>
            {!closed && <Badge tone={h.tone}><h.icon /> {h.label}</Badge>}
            {goal.archived_at && <Badge>Archivé</Badge>}
            {goal.is_demo && <Badge tone="outline">Démo</Badge>}
          </div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{goal.title}</h1>
          {goal.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{goal.description}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Du {formatDate(goal.start_date)} au {formatDate(goal.target_date)}</span>
            <span>Priorité {PRIORITY_LABEL[goal.priority].toLowerCase()}</span>
            {project && (
              <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <ProjectIcon icon={project.icon} color={project.color} size="sm" /> {project.name}
              </Link>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {goal.status !== "achieved" ? (
            <Button onClick={() => patch({ status: "achieved" }, "Objectif atteint, bravo ! 🎯")}><Trophy /> Marquer comme atteint</Button>
          ) : (
            <Button variant="secondary" onClick={() => patch({ status: "in_progress" }, "Objectif rouvert")}><RotateCcw /> Rouvrir</Button>
          )}
          <Button variant="secondary" onClick={() => openGoal(goal)}><Pencil /> Modifier</Button>
          <Dropdown>
            <DropdownTrigger asChild><Button variant="secondary" size="icon" aria-label="Plus d'actions"><MoreHorizontal /></Button></DropdownTrigger>
            <DropdownContent>
              {goal.status !== "abandoned" && <DropdownItem onSelect={() => patch({ status: "abandoned" }, "Objectif abandonné")}><CircleSlash /> Abandonner</DropdownItem>}
              {goal.archived_at ? (
                <DropdownItem onSelect={() => patch({ archived_at: null }, "Objectif restauré")}><ArchiveRestore /> Restaurer</DropdownItem>
              ) : (
                <DropdownItem onSelect={() => patch({ archived_at: new Date().toISOString() }, "Objectif archivé")}><Archive /> Archiver</DropdownItem>
              )}
              <DropdownSeparator />
              <DropdownItem destructive onSelect={() => setConfirmDelete(true)}><Trash2 /> Supprimer</DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>

      {!closed && goalTargetReached(progress) && (
        <Card className="mb-6 flex flex-col gap-3 border-success/30 bg-success-soft/60 p-4 sm:flex-row sm:items-center">
          <Trophy className="size-5 shrink-0 text-success" />
          <p className="flex-1 text-sm"><span className="font-medium">Cible atteinte !</span> <span className="text-muted-foreground">Confirmez pour marquer l&apos;objectif comme atteint.</span></p>
          <Button size="sm" onClick={() => patch({ status: "achieved" }, "Objectif atteint, bravo ! 🎯")}>Confirmer</Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-5">
              <ProgressRing value={progress.percent} size={112} stroke={10} color={h.color} label={`Progression ${progress.percent} %`}>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular leading-none">{progress.percent}%</p>
                </div>
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Progression</p>
                <p className="mt-0.5 text-lg font-semibold tabular">{progressText(goal, progress)}</p>
                <p className={cn("mt-2 text-sm", health === "overdue" ? "text-danger" : "text-muted-foreground")}>
                  {closed ? GOAL_STATUS[goal.status].label : countdownLabel(goal.target_date, today)}
                </p>
              </div>
            </div>

            {goal.progress_mode === "target" && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-2 text-[13px] font-medium text-subtle-foreground">Mettre à jour la progression</p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="icon" aria-label={`Retirer ${step}`} disabled={Number(goal.current_value) <= 0}
                    onClick={() => setValue(Number(goal.current_value) - step)}><Minus /></Button>
                  <form className="flex flex-1 gap-2" onSubmit={(e) => {
                    e.preventDefault();
                    const v = Number(valueInput.replace(",", "."));
                    if (!Number.isFinite(v) || v < 0) return toast.error("Valeur invalide");
                    setValue(v);
                    setValueInput("");
                  }}>
                    <Input aria-label="Nouvelle valeur" inputMode="decimal" placeholder={formatNumber(Number(goal.current_value))}
                      value={valueInput} onChange={(e) => setValueInput(e.target.value)} />
                    <Button type="submit" variant="secondary" disabled={!valueInput}>OK</Button>
                  </form>
                  <Button size="icon" aria-label={`Ajouter ${step}`} onClick={() => setValue(Number(goal.current_value) + step)}><Plus /></Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Cible : {formatNumber(Number(goal.target_value))}{goal.unit ? ` ${goal.unit}` : ""}. La progression n&apos;est jamais déduite du nombre de tâches.</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><Flag className="size-4 text-primary" /> Jalons</span>}
              description={goal.progress_mode === "milestones" ? "La progression est calculée à partir des jalons." : "Étapes intermédiaires (n'affectent pas la valeur cible)."} />
            <CardBody className="px-2">
              {milestones.length === 0 && <p className="px-3 pb-2 text-sm text-muted-foreground">Aucun jalon défini.</p>}
              <ul>
                {milestones.map((m) => (
                  <li key={m.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-hover">
                    <button type="button" aria-pressed={m.status === "completed"} aria-label={m.status === "completed" ? `Rouvrir « ${m.title} »` : `Valider « ${m.title} »`}
                      onClick={() => ms.update.mutate({ id: m.id, patch: { status: m.status === "completed" ? "pending" : "completed" } }, {
                        onSuccess: () => {
                          if (goal.status === "not_started") patch({ status: "in_progress" });
                        },
                        onError: (e) => toast.error(errorMessage(e)),
                      })}
                      className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                        m.status === "completed" ? "border-success bg-success text-white" : "border-border-strong hover:border-success")}>
                      {m.status === "completed" && <Check className="size-3" strokeWidth={3} />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", m.status === "completed" && "text-muted-foreground line-through")}>{m.title}</span>
                      {(m.target_date || m.completed_at) && (
                        <span className="text-xs text-muted-foreground">
                          {m.completed_at ? `Validé le ${formatDate(m.completed_at.slice(0, 10))}` : `Prévu le ${formatDate(m.target_date!)}`}
                        </span>
                      )}
                    </span>
                    <button type="button" aria-label={`Supprimer « ${m.title} »`}
                      onClick={() => ms.remove.mutate(m.id, { onError: (e) => toast.error(errorMessage(e)) })}
                      className="rounded-md p-1 text-muted-foreground opacity-100 hover:bg-surface-muted hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <form className="mt-2 flex gap-2 px-3" onSubmit={(e) => {
                e.preventDefault();
                const title = newMilestone.trim();
                if (!title) return;
                ms.create.mutate({ goal_id: goal.id, title, position: milestones.length }, {
                  onSuccess: () => setNewMilestone(""),
                  onError: (err) => toast.error(errorMessage(err)),
                });
              }}>
                <Input aria-label="Nouveau jalon" placeholder="Ajouter un jalon…" value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} />
                <Button type="submit" variant="secondary" size="icon" aria-label="Ajouter le jalon" disabled={!newMilestone.trim()}><Plus /></Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {!closed && <QuickAdd date={today} goalId={goal.id} projectId={goal.project_id ?? undefined} />}
          <Card>
            <CardHeader title="Tâches associées"
              description={taskStats.planned ? `${taskStats.completed} accomplies · ${taskStats.missed} manquées · ${formatPercent(taskStats.rate)} de réussite` : "Liez des tâches pour suivre l'effort fourni."} />
            <CardBody className="px-2">
              {tasksLoading ? <Skeleton className="mx-3 h-32" /> : tasks.length === 0 ? (
                <EmptyState compact icon={ListTodo} title="Aucune tâche liée" />
              ) : tasks.map((t) => <TaskRow key={t.id} task={t} today={today} showDate />)}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cet objectif ?"
        description="L'objectif et ses jalons seront supprimés. Les tâches associées restent dans votre historique. Pour le ranger, archivez-le plutôt."
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(goal.id);
            toast.success("Objectif supprimé");
            router.replace("/objectives");
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </div>
  );
}
