"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, ListTodo, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickAdd } from "@/components/tasks/quick-add";
import { ReflectionCard } from "@/components/tasks/reflection-card";
import { TaskRow } from "@/components/tasks/task-row";
import { PRIORITY_ORDER } from "@/lib/constants";
import { useCalendarContext } from "@/lib/data/profile";
import { useTasksForDay, useUpdateTask } from "@/lib/data/tasks";
import { formatLongDate, relativeDayLabel, shiftDate } from "@/lib/dates";
import { tally } from "@/lib/metrics";
import type { Task } from "@/lib/types";
import { errorMessage, formatPercent } from "@/lib/utils";

export function TrackerView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { today } = useCalendarContext();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date")! : today;
  const { data: tasks, isLoading, isError, refetch } = useTasksForDay(date);
  const update = useUpdateTask();
  const [confirmMiss, setConfirmMiss] = useState(false);

  const go = (d: string) => router.replace(d === today ? pathname : `${pathname}?date=${d}`, { scroll: false });

  const stats = useMemo(() => tally(tasks ?? []), [tasks]);
  const groups = useMemo(() => {
    const list = tasks ?? [];
    const byPriority = (a: Task, b: Task) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.created_at.localeCompare(b.created_at);
    return {
      pending: list.filter((t) => t.status === "pending").sort(byPriority),
      completed: list.filter((t) => t.status === "completed").sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? "")),
      missed: list.filter((t) => t.status === "missed"),
    };
  }, [tasks]);

  const isPastOrToday = date <= today;

  const markRemainingMissed = async () => {
    setConfirmMiss(false);
    try {
      await Promise.all(groups.pending.map((t) => update.mutateAsync({ id: t.id, patch: { status: "missed" } })));
      toast.success(`${groups.pending.length} tâche(s) marquée(s) comme manquée(s)`, { description: "Elles restent dans votre historique." });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        eyebrow={relativeDayLabel(date, today)}
        title={formatLongDate(date)}
        actions={
          <>
            <div className="flex items-center rounded-[10px] border border-border bg-surface shadow-card">
              <Button variant="ghost" size="icon" aria-label="Jour précédent" onClick={() => go(shiftDate(date, -1))}><ChevronLeft /></Button>
              <label className="relative flex h-9 items-center gap-2 px-2 text-[13px] font-medium">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span className="sr-only">Choisir une date</span>
                <input type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)}
                  className="w-[118px] bg-transparent outline-none [color-scheme:inherit]" />
              </label>
              <Button variant="ghost" size="icon" aria-label="Jour suivant" onClick={() => go(shiftDate(date, 1))}><ChevronRight /></Button>
            </div>
            {date !== today && <Button variant="secondary" onClick={() => go(today)}>Aujourd&apos;hui</Button>}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {/* Day summary */}
          <Card className="p-5">
            {isLoading ? (
              <div className="flex items-center gap-6"><Skeleton className="size-[88px] rounded-full" /><Skeleton className="h-14 flex-1" /></div>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ProgressRing value={stats.rate} size={88} stroke={8} color="var(--success)" label={`Taux d'accomplissement ${formatPercent(stats.rate)}`}>
                  <div className="text-center">
                    <p className="text-lg font-semibold tabular leading-none">{formatPercent(stats.rate)}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">accompli</p>
                  </div>
                </ProgressRing>
                <dl className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric icon={ListTodo} label="Planifiées" value={stats.planned} tone="text-primary" />
                  <Metric icon={CheckCircle2} label="Accomplies" value={stats.completed} tone="text-success" />
                  <Metric icon={XCircle} label="Manquées" value={stats.missed} tone="text-danger" />
                  <Metric icon={CircleDashed} label="Restantes" value={stats.pending} tone="text-warning" />
                </dl>
              </div>
            )}
          </Card>

          <QuickAdd date={date} autoFocus={date === today} />

          {isError ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-danger">Impossible de charger les tâches.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Réessayer</Button>
            </Card>
          ) : isLoading ? (
            <Card className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</Card>
          ) : stats.planned === 0 ? (
            <Card>
              <EmptyState
                icon={ListTodo}
                title={date < today ? "Aucune tâche ce jour-là" : "Rien de prévu pour l'instant"}
                description={date < today ? "Vous pouvez encore ajouter ce que vous avez accompli." : "Ajoutez ce que vous voulez accomplir. Appuyez sur Entrée pour créer."}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              <TaskGroup title="À faire" count={groups.pending.length} tasks={groups.pending} today={today}
                action={isPastOrToday && groups.pending.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmMiss(true)}>Marquer le reste comme manqué</Button>
                ) : undefined}
                emptyText="Tout est traité pour cette journée 🎉" />
              {groups.completed.length > 0 && <TaskGroup title="Accomplies" count={groups.completed.length} tasks={groups.completed} today={today} />}
              {groups.missed.length > 0 && <TaskGroup title="Manquées" count={groups.missed.length} tasks={groups.missed} today={today} />}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <ReflectionCard date={date} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmMiss}
        onOpenChange={setConfirmMiss}
        title="Clôturer la journée ?"
        description={`${groups.pending.length} tâche(s) en attente seront marquées comme manquées. Elles resteront visibles dans votre historique et vous pourrez toujours changer leur statut.`}
        confirmLabel="Marquer comme manquées"
        destructive={false}
        onConfirm={markRemainingMissed}
      />
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof ListTodo; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-muted/60 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={`size-3.5 ${tone}`} />{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular">{value}</dd>
    </div>
  );
}

function TaskGroup({ title, count, tasks, today, action, emptyText }: {
  title: string; count: number; tasks: Task[]; today: string; action?: React.ReactNode; emptyText?: string;
}) {
  return (
    <Card>
      <CardHeader title={<span>{title} <span className="ml-1 text-muted-foreground tabular">{count}</span></span>} action={action} className="pb-1" />
      <CardBody className="px-2 pb-2">
        {tasks.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} today={today} />)
        )}
      </CardBody>
    </Card>
  );
}
