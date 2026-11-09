"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useAppActions } from "@/components/shell/app-actions";
import { DEFAULT_CATEGORIES, PRIORITIES, TASK_STATUS } from "@/lib/constants";
import { useGoals, useProjects } from "@/lib/data/entities";
import { useCalendarContext, useProfile } from "@/lib/data/profile";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/lib/data/tasks";
import { taskSchema, type TaskFormInput, type TaskFormValues } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export function TaskDialog() {
  const { taskDialog, closeTask } = useAppActions();
  return (
    <Dialog open={!!taskDialog} onOpenChange={(o) => !o && closeTask()}>
      {taskDialog && (
        <DialogContent
          title={taskDialog.task ? "Modifier la tâche" : "Nouvelle tâche"}
          description={taskDialog.task ? undefined : "Planifiez ce que vous voulez accomplir."}
          className="max-w-xl"
        >
          <TaskForm key={taskDialog.task?.id ?? "new"} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function TaskForm() {
  const { taskDialog, closeTask } = useAppActions();
  const task = taskDialog?.task;
  const { today } = useCalendarContext();
  const { data: profile } = useProfile();
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<TaskFormInput, unknown, TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      notes: task?.notes ?? "",
      category: task?.category ?? "",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      scheduled_date: task?.scheduled_date ?? taskDialog?.defaults?.scheduled_date ?? today,
      due_date: task?.due_date ?? "",
      project_id: task?.project_id ?? taskDialog?.defaults?.project_id ?? "",
      goal_id: task?.goal_id ?? taskDialog?.defaults?.goal_id ?? "",
    },
  });
  const { register, handleSubmit, formState, watch, setValue } = form;
  const projectId = watch("project_id");

  // Keep goal coherent with the selected project
  const availableGoals = useMemo(
    () =>
      goals.filter(
        (g) => !g.archived_at && (g.status !== "achieved" || g.id === task?.goal_id) && (!projectId || !g.project_id || g.project_id === projectId),
      ),
    [goals, projectId, task?.goal_id],
  );
  useEffect(() => {
    const gid = form.getValues("goal_id");
    if (gid && !availableGoals.some((g) => g.id === gid)) setValue("goal_id", "");
  }, [availableGoals, form, setValue]);

  const categories = useMemo(
    () => [...new Set([...(profile?.focus_areas ?? []), ...DEFAULT_CATEGORIES])],
    [profile?.focus_areas],
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (task) {
        await update.mutateAsync({ id: task.id, patch: values });
        toast.success("Tâche mise à jour");
      } else {
        await create.mutateAsync(values);
        toast.success("Tâche ajoutée");
      }
      closeTask();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  const activeProjects = projects.filter((p) => !p.archived_at || p.id === task?.project_id);
  const e = formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Titre" htmlFor="t-title" error={e.title?.message}>
        <Input id="t-title" autoFocus placeholder="Ex. Rédiger l'introduction du rapport" {...register("title")} aria-invalid={!!e.title} />
      </Field>
      <Field label="Description" htmlFor="t-desc" error={e.description?.message}>
        <Textarea id="t-desc" rows={2} placeholder="Facultatif" {...register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date prévue" htmlFor="t-date" error={e.scheduled_date?.message}>
          <Input id="t-date" type="date" {...register("scheduled_date")} />
        </Field>
        <Field label="Échéance" htmlFor="t-due" error={e.due_date?.message}>
          <Input id="t-due" type="date" {...register("due_date")} />
        </Field>
        <Field label="Projet" htmlFor="t-project">
          <NativeSelect id="t-project" {...register("project_id")}>
            <option value="">Aucun projet</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Objectif" htmlFor="t-goal">
          <NativeSelect id="t-goal" {...register("goal_id")}>
            <option value="">Aucun objectif</option>
            {availableGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Catégorie" htmlFor="t-cat" error={e.category?.message}>
          <Input id="t-cat" list="task-categories" placeholder="Ex. Études" {...register("category")} />
          <datalist id="task-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Priorité" htmlFor="t-priority">
          <NativeSelect id="t-priority" {...register("priority")}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Statut" htmlFor="t-status">
          <NativeSelect id="t-status" {...register("status")}>
            {(Object.keys(TASK_STATUS) as (keyof typeof TASK_STATUS)[]).map((s) => (
              <option key={s} value={s}>{TASK_STATUS[s].label}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Notes" htmlFor="t-notes" error={e.notes?.message}>
        <Textarea id="t-notes" rows={3} placeholder="Ressources, liens, remarques…" {...register("notes")} />
      </Field>

      <DialogFooter className="sm:justify-between">
        {task ? (
          <Button type="button" variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Supprimer
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={closeTask}>Annuler</Button>
          <Button type="submit" loading={formState.isSubmitting}>{task ? "Enregistrer" : "Ajouter la tâche"}</Button>
        </div>
      </DialogFooter>

      {task && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Supprimer cette tâche ?"
          description="Elle disparaîtra définitivement de votre historique et de vos statistiques. Pour garder une trace, marquez-la plutôt comme manquée."
          loading={remove.isPending}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(task.id);
              toast.success("Tâche supprimée");
              setConfirmDelete(false);
              closeTask();
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
        />
      )}
    </form>
  );
}
