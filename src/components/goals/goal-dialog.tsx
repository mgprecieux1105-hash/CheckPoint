"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useAppActions } from "@/components/shell/app-actions";
import { GOAL_STATUS, GOAL_TYPES, PRIORITIES } from "@/lib/constants";
import { useGoalMutations, useMilestoneMutations, useProjects } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { monthBounds, shiftDate, weekBounds, yearBounds, type ISODate, type WeekStart } from "@/lib/dates";
import type { GoalType } from "@/lib/types";
import { goalSchema, type GoalFormInput, type GoalFormValues } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export function defaultGoalDates(type: GoalType, today: ISODate, weekStartsOn: WeekStart) {
  switch (type) {
    case "weekly": {
      const b = weekBounds(today, weekStartsOn);
      return { start_date: today, target_date: b.end };
    }
    case "monthly":
      return { start_date: today, target_date: monthBounds(today).end };
    case "annual":
      return { start_date: today, target_date: yearBounds(today).end };
    default:
      return { start_date: today, target_date: shiftDate(today, 90) };
  }
}

export function GoalDialog() {
  const { goalDialog, closeGoal } = useAppActions();
  return (
    <Dialog open={!!goalDialog} onOpenChange={(o) => !o && closeGoal()}>
      {goalDialog && (
        <DialogContent
          title={goalDialog.goal ? "Modifier l'objectif" : "Nouvel objectif"}
          description={goalDialog.goal ? undefined : "Un objectif mesurable, avec une cible ou des jalons."}
          className="max-w-xl"
        >
          <GoalForm key={goalDialog.goal?.id ?? "new"} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function GoalForm() {
  const router = useRouter();
  const { goalDialog, closeGoal } = useAppActions();
  const goal = goalDialog?.goal;
  const { today, weekStartsOn } = useCalendarContext();
  const { data: projects = [] } = useProjects();
  const { create, update } = useGoalMutations();
  const { create: createMilestone } = useMilestoneMutations();
  const [milestones, setMilestones] = useState<string[]>([""]);

  const initialDates = defaultGoalDates("monthly", today, weekStartsOn);
  const { register, handleSubmit, formState, watch, setValue } = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      goal_type: goal?.goal_type ?? "monthly",
      progress_mode: goal?.progress_mode ?? "target",
      unit: goal?.unit ?? "",
      target_value: goal?.target_value ?? 10,
      current_value: goal?.current_value ?? 0,
      start_date: goal?.start_date ?? initialDates.start_date,
      target_date: goal?.target_date ?? initialDates.target_date,
      priority: goal?.priority ?? "medium",
      status: goal?.status ?? "not_started",
      project_id: goal?.project_id ?? goalDialog?.defaults?.project_id ?? "",
    },
  });
  const mode = watch("progress_mode");
  const e = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = values.progress_mode === "milestones" ? { ...values, target_value: 1, current_value: 0 } : values;
      if (goal) {
        await update.mutateAsync({ id: goal.id, patch: payload });
        toast.success("Objectif mis à jour");
        closeGoal();
      } else {
        const row = await create.mutateAsync(payload);
        if (values.progress_mode === "milestones") {
          const titles = milestones.map((m) => m.trim()).filter(Boolean);
          for (const [position, title] of titles.entries()) {
            await createMilestone.mutateAsync({ goal_id: row.id, title, position });
          }
        }
        toast.success("Objectif créé");
        closeGoal();
        router.push(`/objectives/${row.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Titre" htmlFor="g-title" error={e.title?.message}>
        <Input id="g-title" autoFocus placeholder="Ex. Lire 12 livres cette année" {...register("title")} aria-invalid={!!e.title} />
      </Field>
      <Field label="Description" htmlFor="g-desc" error={e.description?.message}>
        <Textarea id="g-desc" rows={2} {...register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Horizon" htmlFor="g-type">
          <NativeSelect
            id="g-type"
            {...register("goal_type", {
              onChange: (ev) => {
                if (goal) return;
                const d = defaultGoalDates(ev.target.value as GoalType, today, weekStartsOn);
                setValue("start_date", d.start_date);
                setValue("target_date", d.target_date);
              },
            })}
          >
            {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Projet associé" htmlFor="g-project">
          <NativeSelect id="g-project" {...register("project_id")}>
            <option value="">Aucun projet</option>
            {projects.filter((p) => !p.archived_at || p.id === goal?.project_id).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Début" htmlFor="g-start" error={e.start_date?.message}>
          <Input id="g-start" type="date" {...register("start_date")} />
        </Field>
        <Field label="Échéance" htmlFor="g-target" error={e.target_date?.message}>
          <Input id="g-target" type="date" {...register("target_date")} />
        </Field>
        <Field label="Priorité" htmlFor="g-priority">
          <NativeSelect id="g-priority" {...register("priority")}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Statut" htmlFor="g-status">
          <NativeSelect id="g-status" {...register("status")}>
            {(Object.keys(GOAL_STATUS) as (keyof typeof GOAL_STATUS)[]).map((s) => (
              <option key={s} value={s}>{GOAL_STATUS[s].label}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-subtle-foreground">Mesure de la progression</p>
          <Segmented
            ariaLabel="Mode de progression"
            value={mode}
            onChange={(v) => setValue("progress_mode", v)}
            options={[
              { value: "target", label: "Valeur cible" },
              { value: "milestones", label: "Jalons" },
            ]}
          />
        </div>
        {mode === "target" ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Actuel" htmlFor="g-current" error={e.current_value?.message}>
              <Input id="g-current" type="number" step="any" min={0} {...register("current_value")} />
            </Field>
            <Field label="Cible" htmlFor="g-tv" error={e.target_value?.message}>
              <Input id="g-tv" type="number" step="any" min={0} {...register("target_value")} />
            </Field>
            <Field label="Unité" htmlFor="g-unit" error={e.unit?.message}>
              <Input id="g-unit" placeholder="km, livres…" {...register("unit")} />
            </Field>
          </div>
        ) : goal ? (
          <p className="text-sm text-muted-foreground">Les jalons se gèrent depuis la page de l&apos;objectif.</p>
        ) : (
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Jalon ${i + 1}`}
                  placeholder={`Jalon ${i + 1}`}
                  value={m}
                  onChange={(ev) => setMilestones((list) => list.map((x, j) => (j === i ? ev.target.value : x)))}
                />
                {milestones.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" aria-label="Retirer"
                    onClick={() => setMilestones((list) => list.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setMilestones((l) => [...l, ""])}>
              <Plus /> Ajouter un jalon
            </Button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={closeGoal}>Annuler</Button>
        <Button type="submit" loading={formState.isSubmitting}>{goal ? "Enregistrer" : "Créer l'objectif"}</Button>
      </DialogFooter>
    </form>
  );
}
