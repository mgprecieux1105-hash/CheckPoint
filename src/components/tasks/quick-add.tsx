"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CornerDownLeft, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { useAppActions } from "@/components/shell/app-actions";
import { PRIORITIES } from "@/lib/constants";
import { useProjects } from "@/lib/data/entities";
import { useCreateTask } from "@/lib/data/tasks";
import type { ISODate } from "@/lib/dates";
import { matchProject, parseQuickAdd } from "@/lib/quick-add";
import type { Priority } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

export function QuickAdd({
  date,
  projectId,
  goalId,
  className,
  autoFocus,
}: {
  date: ISODate;
  projectId?: string;
  goalId?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [project, setProject] = useState(projectId ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [showMeta, setShowMeta] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: projects = [] } = useProjects();
  const create = useCreateTask();
  const { openTask } = useAppActions();
  const active = projects.filter((p) => !p.archived_at);

  const submit = () => {
    const parsed = parseQuickAdd(value);
    if (!parsed.title) return;
    const matched = matchProject(active, parsed.projectQuery);
    if (parsed.projectQuery && !matched) {
      toast.message(`Projet « ${parsed.projectQuery} » introuvable`, { description: "La tâche est créée sans projet." });
    }
    setValue("");
    create.mutate(
      {
        title: parsed.title,
        scheduled_date: date,
        category: parsed.category,
        priority: parsed.priority ?? priority,
        project_id: matched?.id ?? (project || null),
        goal_id: goalId ?? null,
      },
      {
        onError: (e) => {
          toast.error(`La tâche n'a pas été créée : ${errorMessage(e)}`);
          setValue(value);
        },
      },
    );
    inputRef.current?.focus();
  };

  return (
    <div className={cn("rounded-xl border border-border bg-surface shadow-card transition focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/12", className)}>
      <div className="flex items-center gap-2 px-3">
        <Plus className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              setValue("");
              inputRef.current?.blur();
            }
          }}
          aria-label="Ajouter une tâche rapidement"
          placeholder="Ajouter une tâche… (#catégorie @projet !priorité)"
          className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Tooltip content="Options">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Options" aria-expanded={showMeta} onClick={() => setShowMeta((s) => !s)}>
            <SlidersHorizontal />
          </Button>
        </Tooltip>
        <Tooltip content="Détails complets">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="max-sm:hidden"
            onClick={() => openTask({ defaults: { scheduled_date: date, project_id: project || projectId || null, goal_id: goalId ?? null } })}
          >
            Détails
          </Button>
        </Tooltip>
        <Button type="button" size="icon-sm" aria-label="Créer la tâche" disabled={!value.trim()} onClick={submit}>
          <CornerDownLeft />
        </Button>
      </div>
      {showMeta && (
        <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2.5">
          {!projectId && (
            <NativeSelect aria-label="Projet" value={project} onChange={(e) => setProject(e.target.value)} className="h-8 w-auto text-[13px]">
              <option value="">Sans projet</option>
              {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          )}
          <NativeSelect aria-label="Priorité" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="h-8 w-auto text-[13px]">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>Priorité {p.label.toLowerCase()}</option>)}
          </NativeSelect>
        </div>
      )}
    </div>
  );
}
