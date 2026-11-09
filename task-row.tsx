"use client";

import { memo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, CircleDashed, MoreHorizontal, Pencil, Target, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useAppActions } from "@/components/shell/app-actions";
import { ProjectDot } from "@/components/projects/project-icon";
import { useGoalMap, useProjectMap } from "@/lib/data/entities";
import { useDeleteTask, useUpdateTask } from "@/lib/data/tasks";
import { formatDate, type ISODate } from "@/lib/dates";
import type { Task, TaskStatus } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { PriorityFlag, StatusBadge } from "./status";

export function useTaskStatusChange() {
  const update = useUpdateTask();
  return (task: Task, status: TaskStatus) => {
    if (task.id.startsWith("temp-")) return;
    update.mutate(
      { id: task.id, patch: { status } },
      {
        onError: (e) => toast.error(`Impossible de mettre à jour : ${errorMessage(e)}`),
        onSuccess: () => {
          if (status === "missed") toast("Tâche marquée comme manquée", { description: "Elle reste visible dans votre historique." });
        },
      },
    );
  };
}

export const TaskRow = memo(function TaskRow({
  task,
  today,
  showDate,
  hideProject,
  readOnly,
  highlighted,
}: {
  task: Task;
  today: ISODate;
  showDate?: boolean;
  hideProject?: boolean;
  readOnly?: boolean;
  highlighted?: boolean;
}) {
  const { openTask } = useAppActions();
  const projects = useProjectMap();
  const goals = useGoalMap();
  const setStatus = useTaskStatusChange();
  const remove = useDeleteTask();
  const [confirm, setConfirm] = useState(false);
  const project = task.project_id ? projects.get(task.project_id) : undefined;
  const goal = task.goal_id ? goals.get(task.goal_id) : undefined;
  const pending = task.id.startsWith("temp-");
  const overdue = task.status === "pending" && (task.due_date ? task.due_date < today : task.scheduled_date < today);

  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover",
        pending && "opacity-60",
        highlighted && "bg-primary-soft/60 ring-1 ring-primary/30",
      )}
    >
      {!readOnly ? (
        <Tooltip content={task.status === "completed" ? "Remettre en attente" : "Marquer comme accomplie"}>
          <button
            type="button"
            aria-label={task.status === "completed" ? `Remettre « ${task.title} » en attente` : `Marquer « ${task.title} » comme accomplie`}
            aria-pressed={task.status === "completed"}
            onClick={() => setStatus(task, task.status === "completed" ? "pending" : "completed")}
            className={cn(
              "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-all",
              task.status === "completed"
                ? "border-success bg-success text-white"
                : task.status === "missed"
                  ? "border-danger bg-danger-soft text-danger"
                  : "border-border-strong hover:border-success hover:bg-success-soft",
            )}
          >
            {task.status === "completed" ? <Check className="size-3.5" strokeWidth={3} /> : task.status === "missed" ? <X className="size-3" strokeWidth={3} /> : null}
          </button>
        </Tooltip>
      ) : (
        <span className="mt-0.5"><StatusDot status={task.status} /></span>
      )}

      <button type="button" onClick={() => !pending && openTask({ task })} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block text-sm leading-snug",
            task.status === "completed" && "text-muted-foreground line-through decoration-border-strong",
            task.status === "missed" && "text-subtle-foreground",
          )}
        >
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {project && !hideProject && (
            <span className="inline-flex items-center gap-1.5"><ProjectDot color={project.color} />{project.name}</span>
          )}
          {goal && <span className="inline-flex items-center gap-1"><Target className="size-3" />{goal.title}</span>}
          {task.category && <span>#{task.category}</span>}
          {showDate && <span className="tabular">{formatDate(task.scheduled_date, "d MMM yyyy")}</span>}
          {task.due_date && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-danger")}>
              <CalendarClock className="size-3" /> {formatDate(task.due_date, "d MMM")}
            </span>
          )}
          {task.is_demo && <Badge tone="outline" className="py-0 text-[10px]">Démo</Badge>}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {task.status !== "pending" && <span className="max-sm:hidden"><StatusBadge status={task.status} /></span>}
        {task.status === "pending" && overdue && <Badge tone="warning" className="max-sm:hidden">En retard</Badge>}
        <PriorityFlag priority={task.priority} />
        {!readOnly && !pending && (
          <Dropdown>
            <DropdownTrigger
              aria-label={`Actions pour « ${task.title} »`}
              className="rounded-md p-1 text-muted-foreground opacity-100 transition hover:bg-surface-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </DropdownTrigger>
            <DropdownContent>
              {task.status !== "completed" && <DropdownItem onSelect={() => setStatus(task, "completed")}><Check /> Accomplie</DropdownItem>}
              {task.status !== "missed" && <DropdownItem onSelect={() => setStatus(task, "missed")}><X /> Manquée</DropdownItem>}
              {task.status !== "pending" && <DropdownItem onSelect={() => setStatus(task, "pending")}><CircleDashed /> En attente</DropdownItem>}
              <DropdownSeparator />
              <DropdownItem onSelect={() => openTask({ task })}><Pencil /> Modifier</DropdownItem>
              <DropdownItem destructive onSelect={() => setConfirm(true)}><Trash2 /> Supprimer</DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Supprimer cette tâche ?"
        description="Elle disparaîtra définitivement de votre historique. Pour garder une trace, marquez-la plutôt comme manquée."
        onConfirm={() => {
          setConfirm(false);
          remove.mutate(task.id, {
            onSuccess: () => toast.success("Tâche supprimée"),
            onError: (e) => toast.error(errorMessage(e)),
          });
        }}
      />
    </div>
  );
});

export function StatusDot({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex size-[18px] items-center justify-center rounded-full",
        status === "completed" ? "bg-success text-white" : status === "missed" ? "bg-danger-soft text-danger" : "border-2 border-border-strong",
      )}
      aria-label={status}
    >
      {status === "completed" && <Check className="size-3" strokeWidth={3} />}
      {status === "missed" && <X className="size-3" strokeWidth={3} />}
    </span>
  );
}
