"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useAppActions } from "@/components/shell/app-actions";
import { useProjectMutations } from "@/lib/data/entities";
import type { Project } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

export function useArchiveProject() {
  const { update } = useProjectMutations();
  return (project: Project, archive: boolean) =>
    update.mutate(
      {
        id: project.id,
        patch: archive
          ? { status: "archived", archived_at: new Date().toISOString() }
          : { status: "active", archived_at: null },
      },
      {
        onSuccess: () => toast.success(archive ? "Projet archivé" : "Projet restauré", archive ? { description: "Ses tâches restent dans votre historique." } : undefined),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
}

export function ProjectActions({ project, redirectOnDelete, variant = "icon" }: { project: Project; redirectOnDelete?: boolean; variant?: "icon" | "button" }) {
  const router = useRouter();
  const { openProject } = useAppActions();
  const { remove } = useProjectMutations();
  const archive = useArchiveProject();
  const [confirm, setConfirm] = useState(false);
  const archived = !!project.archived_at;

  return (
    // Stop clicks (including those bubbling from portals) from reaching a parent link card.
    <span className="contents" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <Dropdown>
        <DropdownTrigger asChild>
          {variant === "icon" ? (
            <Button variant="ghost" size="icon-sm" aria-label={`Actions du projet ${project.name}`}>
              <MoreHorizontal />
            </Button>
          ) : (
            <Button variant="secondary" aria-label="Plus d'actions"><MoreHorizontal /></Button>
          )}
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem onSelect={() => openProject(project)}><Pencil /> Modifier</DropdownItem>
          <DropdownItem onSelect={() => archive(project, !archived)}>
            {archived ? <><ArchiveRestore /> Restaurer</> : <><Archive /> Archiver</>}
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem destructive onSelect={() => setConfirm(true)}><Trash2 /> Supprimer</DropdownItem>
        </DropdownContent>
      </Dropdown>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Supprimer « ${project.name} » ?`}
        description="Le projet sera supprimé. Ses tâches et objectifs sont conservés dans votre historique, sans projet associé. Pour simplement le ranger, archivez-le."
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(project.id);
            setConfirm(false);
            toast.success("Projet supprimé");
            if (redirectOnDelete) router.replace("/projects");
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </span>
  );
}
