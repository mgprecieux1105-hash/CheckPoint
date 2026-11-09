"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useReflection, useSaveReflection } from "@/lib/data/entities";
import type { ISODate } from "@/lib/dates";
import { reflectionSchema } from "@/lib/validation";
import { cn, errorMessage } from "@/lib/utils";

const MOODS = [
  { v: 1, e: "😞", l: "Difficile" },
  { v: 2, e: "😕", l: "Moyenne" },
  { v: 3, e: "🙂", l: "Correcte" },
  { v: 4, e: "😊", l: "Bonne" },
  { v: 5, e: "🤩", l: "Excellente" },
];

export function ReflectionCard({ date, readOnly }: { date: ISODate; readOnly?: boolean }) {
  const { data, isLoading } = useReflection(date);
  const save = useSaveReflection();
  const [form, setForm] = useState({ positive_reflection: "", missed_accomplishments: "", improvement_notes: "", mood: null as number | null });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm({
      positive_reflection: data?.positive_reflection ?? "",
      missed_accomplishments: data?.missed_accomplishments ?? "",
      improvement_notes: data?.improvement_notes ?? "",
      mood: data?.mood ?? null,
    });
    setDirty(false);
  }, [data, date]);

  const set = (k: keyof typeof form, v: string | number | null) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const onSave = async () => {
    const parsed = reflectionSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Réflexion invalide");
    try {
      await save.mutateAsync({ reflection_date: date, ...parsed.data });
      setDirty(false);
      toast.success("Réflexion enregistrée");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const empty = !data && readOnly;

  return (
    <Card>
      <CardHeader
        title={<span className="inline-flex items-center gap-2"><NotebookPen className="size-4 text-accent" /> Réflexion du jour</span>}
        description={readOnly ? undefined : "Quelques lignes pour apprendre de votre journée."}
        action={data && !dirty ? <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="size-3.5" /> Enregistrée</span> : null}
      />
      <CardBody className="space-y-4">
        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">Aucune réflexion enregistrée pour ce jour.</p>
        ) : (
          <>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-subtle-foreground">Comment s&apos;est passée la journée ?</p>
              <div className="flex gap-1.5" role="radiogroup" aria-label="Humeur">
                {MOODS.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    role="radio"
                    aria-checked={form.mood === m.v}
                    aria-label={m.l}
                    title={m.l}
                    disabled={readOnly}
                    onClick={() => set("mood", form.mood === m.v ? null : m.v)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border text-lg transition",
                      form.mood === m.v ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-hover",
                      readOnly && "cursor-default",
                    )}
                  >
                    {m.e}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Qu'est-ce qui s'est bien passé ?" htmlFor={`r-pos-${date}`}>
              <Textarea id={`r-pos-${date}`} rows={2} readOnly={readOnly} value={form.positive_reflection}
                onChange={(e) => set("positive_reflection", e.target.value)} />
            </Field>
            <Field label="Qu'est-ce que je n'ai pas accompli ?" htmlFor={`r-miss-${date}`}>
              <Textarea id={`r-miss-${date}`} rows={2} readOnly={readOnly} value={form.missed_accomplishments}
                onChange={(e) => set("missed_accomplishments", e.target.value)} />
            </Field>
            <Field label="Que puis-je améliorer demain ?" htmlFor={`r-imp-${date}`}>
              <Textarea id={`r-imp-${date}`} rows={2} readOnly={readOnly} value={form.improvement_notes}
                onChange={(e) => set("improvement_notes", e.target.value)} />
            </Field>
            {!readOnly && (
              <div className="flex justify-end">
                <Button onClick={onSave} loading={save.isPending} disabled={!dirty} variant={dirty ? "primary" : "secondary"}>
                  Enregistrer la réflexion
                </Button>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
