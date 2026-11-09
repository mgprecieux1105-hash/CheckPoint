"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, FlaskConical, Plus, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ICONS } from "@/components/projects/project-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { FOCUS_AREAS, PROJECT_COLORS } from "@/lib/constants";
import { useDemoWorkspace, useGoalMutations, useProjectMutations } from "@/lib/data/entities";
import { useCalendarContext, useProfile, useUpdateProfile } from "@/lib/data/profile";
import { useCreateTask } from "@/lib/data/tasks";
import { defaultGoalDates } from "@/components/goals/goal-dialog";
import type { GoalType } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

const STEPS = ["Vous", "Domaines", "Projet", "Objectif", "Tâches"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { today, weekStartsOn } = useCalendarContext();
  const updateProfile = useUpdateProfile();
  const { create: createProject } = useProjectMutations();
  const { create: createGoal } = useGoalMutations();
  const createTask = useCreateTask();
  const { seed } = useDemoWorkspace();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [project, setProject] = useState({ name: "", color: PROJECT_COLORS[0], icon: "folder" });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goal, setGoal] = useState({ title: "", type: "monthly" as GoalType, target: "10", unit: "" });
  const [goalId, setGoalId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    if (profile) {
      setName((n) => n || profile.full_name || "");
      setAreas((a) => (a.length ? a : profile.focus_areas ?? []));
    }
  }, [profile]);

  const finish = async (target = "/overview") => {
    await updateProfile.mutateAsync({ onboarding_completed_at: new Date().toISOString() }).catch(() => undefined);
    router.replace(target);
  };

  const next = async () => {
    setBusy(true);
    try {
      if (step === 0 && name.trim()) {
        await updateProfile.mutateAsync({ full_name: name.trim().slice(0, 120), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      }
      if (step === 1) await updateProfile.mutateAsync({ focus_areas: areas });
      if (step === 2 && project.name.trim() && !projectId) {
        const row = await createProject.mutateAsync({ name: project.name.trim(), color: project.color, icon: project.icon, start_date: today });
        setProjectId(row.id);
      }
      if (step === 3 && goal.title.trim() && !goalId) {
        const target = Number(goal.target.replace(",", "."));
        if (!Number.isFinite(target) || target <= 0) throw new Error("La cible doit être un nombre positif");
        const dates = defaultGoalDates(goal.type, today, weekStartsOn);
        const row = await createGoal.mutateAsync({
          title: goal.title.trim(), goal_type: goal.type, target_value: target, unit: goal.unit.trim() || null,
          project_id: projectId, ...dates, status: "in_progress",
        });
        setGoalId(row.id);
      }
      if (step === 4) {
        const titles = tasks.map((t) => t.trim()).filter(Boolean);
        for (const title of titles) {
          await createTask.mutateAsync({ title, scheduled_date: today, project_id: projectId, goal_id: goalId, category: areas[0] ?? null });
        }
        await finish(titles.length ? "/tracker" : "/overview");
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <Button variant="ghost" onClick={() => finish()}>Passer et accéder au tableau de bord</Button>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-16 pt-6">
        <ol className="mb-10 flex items-center gap-2" aria-label="Étapes">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col gap-1.5">
              <span className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />
              <span className={cn("text-[11px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            </li>
          ))}
        </ol>

        <div key={step} className="animate-slide-up">
          {step === 0 && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">Bienvenue sur CheckPoint</h1>
              <p className="mt-2 text-sm text-muted-foreground">Comment souhaitez-vous être appelé ?</p>
              <Field label="Votre nom" htmlFor="o-name" className="mt-8">
                <Input id="o-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && next()} />
              </Field>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">Vos domaines de progression</h1>
              <p className="mt-2 text-sm text-muted-foreground">Ils servent de catégories suggérées pour vos tâches. Choisissez-en autant que vous voulez.</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {FOCUS_AREAS.map((a) => {
                  const Icon = ICONS[a.icon];
                  const on = areas.includes(a.value);
                  return (
                    <button key={a.value} type="button" aria-pressed={on}
                      onClick={() => setAreas((l) => (on ? l.filter((x) => x !== a.value) : [...l, a.value]))}
                      className={cn("flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition",
                        on ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:border-border-strong")}>
                      <Icon className="size-4" />
                      <span className="flex-1">{a.label}</span>
                      {on && <Check className="size-4" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">Votre premier projet</h1>
              <p className="mt-2 text-sm text-muted-foreground">Un projet regroupe des tâches liées : un cursus, une entreprise, un programme sportif…</p>
              {projectId ? (
                <p className="mt-8 rounded-xl bg-success-soft p-4 text-sm text-success">Projet « {project.name} » créé.</p>
              ) : (
                <div className="mt-8 space-y-4">
                  <Field label="Nom du projet" htmlFor="o-project">
                    <Input id="o-project" autoFocus placeholder="Ex. Master en informatique" value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleur">
                    {PROJECT_COLORS.slice(0, 8).map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={project.color === c} aria-label={c}
                        onClick={() => setProject((p) => ({ ...p, color: c }))}
                        className={cn("flex size-7 items-center justify-center rounded-full", project.color === c && "ring-2 ring-offset-2 ring-offset-background")}
                        style={{ background: c, ["--tw-ring-color" as string]: c }}>
                        {project.color === c && <Check className="size-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icône">
                    {Object.entries(ICONS).slice(0, 10).map(([k, Icon]) => (
                      <button key={k} type="button" role="radio" aria-checked={project.icon === k} aria-label={k}
                        onClick={() => setProject((p) => ({ ...p, icon: k }))}
                        className={cn("flex size-9 items-center justify-center rounded-lg border text-muted-foreground", project.icon === k ? "border-border bg-surface" : "border-transparent hover:bg-surface")}
                        style={project.icon === k ? { color: project.color } : undefined}>
                        <Icon className="size-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">Votre premier objectif</h1>
              <p className="mt-2 text-sm text-muted-foreground">Un objectif mesurable, avec une cible chiffrée. Vous pourrez aussi utiliser des jalons plus tard.</p>
              {goalId ? (
                <p className="mt-8 rounded-xl bg-success-soft p-4 text-sm text-success">Objectif « {goal.title} » créé.</p>
              ) : (
                <div className="mt-8 space-y-4">
                  <Field label="Objectif" htmlFor="o-goal">
                    <Input id="o-goal" autoFocus placeholder="Ex. Lire 4 livres" value={goal.title} onChange={(e) => setGoal((g) => ({ ...g, title: e.target.value }))} />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Horizon" htmlFor="o-type">
                      <NativeSelect id="o-type" value={goal.type} onChange={(e) => setGoal((g) => ({ ...g, type: e.target.value as GoalType }))}>
                        <option value="weekly">Semaine</option>
                        <option value="monthly">Mois</option>
                        <option value="annual">Année</option>
                        <option value="custom">Long terme</option>
                      </NativeSelect>
                    </Field>
                    <Field label="Cible" htmlFor="o-target">
                      <Input id="o-target" inputMode="decimal" value={goal.target} onChange={(e) => setGoal((g) => ({ ...g, target: e.target.value }))} />
                    </Field>
                    <Field label="Unité" htmlFor="o-unit">
                      <Input id="o-unit" placeholder="livres" value={goal.unit} onChange={(e) => setGoal((g) => ({ ...g, unit: e.target.value }))} />
                    </Field>
                  </div>
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">Vos tâches du jour</h1>
              <p className="mt-2 text-sm text-muted-foreground">Qu&apos;allez-vous accomplir aujourd&apos;hui ? Commencez petit.</p>
              <div className="mt-8 space-y-2">
                {tasks.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Input aria-label={`Tâche ${i + 1}`} autoFocus={i === 0} placeholder={`Tâche ${i + 1}`} value={t}
                      onChange={(e) => setTasks((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
                    {tasks.length > 1 && (
                      <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setTasks((l) => l.filter((_, j) => j !== i))}><X /></Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setTasks((l) => [...l, ""])}><Plus /> Ajouter</Button>
              </div>
            </>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep((s) => s - 1)}><ArrowLeft /> Retour</Button> : <span />}
          <div className="flex gap-2">
            {step >= 2 && step <= 3 && <Button variant="secondary" onClick={() => setStep((s) => s + 1)}>Passer</Button>}
            <Button onClick={next} loading={busy}>{step === 4 ? "Accéder à mon tableau de bord" : "Continuer"} <ArrowRight /></Button>
          </div>
        </div>

        {step === 0 && (
          <div className="mt-14 rounded-2xl border border-dashed border-border-strong p-5">
            <p className="inline-flex items-center gap-2 text-sm font-medium"><FlaskConical className="size-4 text-accent" /> Envie d&apos;explorer d&apos;abord ?</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Chargez un espace de démonstration avec deux mois d&apos;historique fictif, clairement marqué « Démo » et supprimable en un clic.</p>
            <Button variant="secondary" size="sm" className="mt-3" loading={seed.isPending}
              onClick={() => seed.mutate(today, { onSuccess: () => finish(), onError: (e) => toast.error(errorMessage(e)) })}>
              Explorer avec la démo
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
