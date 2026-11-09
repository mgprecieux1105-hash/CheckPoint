"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useAppActions } from "@/components/shell/app-actions";
import { PRIORITIES, PROJECT_COLORS, PROJECT_ICONS, PROJECT_STATUS } from "@/lib/constants";
import { useProjectMutations } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { projectSchema, type ProjectFormInput, type ProjectFormValues } from "@/lib/validation";
import { cn, errorMessage } from "@/lib/utils";
import { ICONS } from "./project-icon";

export function ProjectDialog() {
  const { projectDialog, closeProject } = useAppActions();
  return (
    <Dialog open={!!projectDialog} onOpenChange={(o) => !o && closeProject()}>
      {projectDialog && (
        <DialogContent title={projectDialog.project ? "Modifier le projet" : "Nouveau projet"} className="max-w-xl">
          <ProjectForm key={projectDialog.project?.id ?? "new"} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ProjectForm() {
  const router = useRouter();
  const { projectDialog, closeProject } = useAppActions();
  const project = projectDialog?.project;
  const { today } = useCalendarContext();
  const { create, update } = useProjectMutations();

  const { register, handleSubmit, formState, watch, setValue } = useForm<ProjectFormInput, unknown, ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      color: project?.color ?? PROJECT_COLORS[0],
      icon: project?.icon ?? "folder",
      start_date: project?.start_date ?? today,
      target_date: project?.target_date ?? "",
      priority: project?.priority ?? "medium",
      status: project?.status ?? "active",
    },
  });
  const color = watch("color");
  const icon = watch("icon");
  const e = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const archived_at = values.status === "archived" ? (project?.archived_at ?? new Date().toISOString()) : null;
      if (project) {
        await update.mutateAsync({ id: project.id, patch: { ...values, archived_at } });
        toast.success("Projet mis à jour");
        closeProject();
      } else {
        const row = await create.mutateAsync({ ...values, archived_at });
        toast.success("Projet créé");
        closeProject();
        router.push(`/projects/${row.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Nom" htmlFor="p-name" error={e.name?.message}>
        <Input id="p-name" autoFocus placeholder="Ex. Université, Lancement business…" {...register("name")} aria-invalid={!!e.name} />
      </Field>
      <Field label="Description" htmlFor="p-desc" error={e.description?.message}>
        <Textarea id="p-desc" rows={2} {...register("description")} />
      </Field>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-subtle-foreground">Couleur et icône</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleur">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setValue("color", c)}
              className={cn("flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition", color === c && "ring-2")}
              style={{ background: c, ["--tw-ring-color" as string]: c }}
            >
              {color === c && <Check className="size-3.5 text-white" />}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Icône">
          {PROJECT_ICONS.map((name) => {
            const Icon = ICONS[name];
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={icon === name}
                aria-label={name}
                onClick={() => setValue("icon", name)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:bg-surface-hover",
                  icon === name && "border-border bg-surface-muted",
                )}
                style={icon === name ? { color } : undefined}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date de début" htmlFor="p-start" error={e.start_date?.message}>
          <Input id="p-start" type="date" {...register("start_date")} />
        </Field>
        <Field label="Date cible" htmlFor="p-target" error={e.target_date?.message}>
          <Input id="p-target" type="date" {...register("target_date")} />
        </Field>
        <Field label="Priorité" htmlFor="p-priority">
          <NativeSelect id="p-priority" {...register("priority")}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Statut" htmlFor="p-status">
          <NativeSelect id="p-status" {...register("status")}>
            {(Object.keys(PROJECT_STATUS) as (keyof typeof PROJECT_STATUS)[]).map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS[s].label}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={closeProject}>Annuler</Button>
        <Button type="submit" loading={formState.isSubmitting}>{project ? "Enregistrer" : "Créer le projet"}</Button>
      </DialogFooter>
    </form>
  );
}
