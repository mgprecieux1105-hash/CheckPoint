"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, FolderKanban, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectIcon } from "@/components/projects/project-icon";
import { useAppActions } from "@/components/shell/app-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_LABEL, PROJECT_STATUS } from "@/lib/constants";
import { useProjects } from "@/lib/data/entities";
import { useCalendarContext } from "@/lib/data/profile";
import { useAllTasksLight } from "@/lib/data/tasks";
import { countdownLabel, formatDate } from "@/lib/dates";
import { groupStats } from "@/lib/metrics";
import { formatPercent } from "@/lib/utils";

export default function ProjectsPage() {
  const { openProject } = useAppActions();
  const { today } = useCalendarContext();
  const { data: projects, isLoading } = useProjects();
  const { data: tasks = [] } = useAllTasksLight();
  const [view, setView] = useState<"active" | "archived">("active");

  const stats = useMemo(() => new Map(groupStats(tasks, (t) => t.project_id).map((g) => [g.id, g])), [tasks]);
  const list = (projects ?? []).filter((p) => (view === "archived" ? !!p.archived_at : !p.archived_at));
  const archivedCount = (projects ?? []).filter((p) => p.archived_at).length;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Projets"
        description="Organisez vos accomplissements par domaine : études, business, sport…"
        actions={
          <>
            <Segmented ariaLabel="Filtre" size="md" value={view} onChange={setView}
              options={[{ value: "active", label: "En cours" }, { value: "archived", label: `Archivés${archivedCount ? ` · ${archivedCount}` : ""}` }]} />
            <Button onClick={() => openProject()}><Plus /> Nouveau projet</Button>
          </>
        }
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={FolderKanban}
            title={view === "archived" ? "Aucun projet archivé" : "Aucun projet pour l'instant"}
            description={view === "archived" ? "Les projets archivés et leurs historiques apparaîtront ici." : "Créez un projet pour regrouper vos tâches et suivre sa progression."}
            action={view === "active" ? <Button onClick={() => openProject()}><Plus /> Créer un projet</Button> : undefined} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const s = stats.get(p.id);
            const status = PROJECT_STATUS[p.status];
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group focus-visible:outline-none">
                <Card className="flex h-full flex-col p-5 transition group-hover:border-border-strong group-hover:shadow-pop group-focus-visible:ring-2 group-focus-visible:ring-ring">
                  <div className="flex items-start justify-between gap-3">
                    <ProjectIcon icon={p.icon} color={p.color} size="lg" />
                    <div className="flex items-center gap-1">
                      {p.is_demo && <Badge tone="outline">Démo</Badge>}
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <ProjectActions project={p} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-muted-foreground">{p.description || "Pas de description"}</p>
                  <div className="mt-auto pt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s ? `${s.completed}/${s.planned} accomplies` : "Aucune tâche"}</span>
                      <span className="font-semibold tabular">{formatPercent(s?.rate ?? null)}</span>
                    </div>
                    <ProgressBar value={s?.rate ?? 0} color={p.color} label={`Taux d'accomplissement de ${p.name}`} />
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Priorité {PRIORITY_LABEL[p.priority].toLowerCase()}</span>
                      {p.target_date && (
                        <span className="inline-flex items-center gap-1" title={formatDate(p.target_date)}>
                          <CalendarClock className="size-3.5" />
                          {p.status === "completed" ? formatDate(p.target_date, "d MMM yyyy") : countdownLabel(p.target_date, today)}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
