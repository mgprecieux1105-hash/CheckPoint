"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Goal, Project, Task } from "@/lib/types";

export interface TaskDialogState {
  task?: Task;
  defaults?: Partial<Pick<Task, "scheduled_date" | "project_id" | "goal_id">>;
}

interface AppActions {
  openTask: (state?: TaskDialogState) => void;
  openProject: (project?: Project) => void;
  openGoal: (goal?: Goal, defaults?: { project_id?: string }) => void;
  openCommand: () => void;
  taskDialog: TaskDialogState | null;
  projectDialog: { project?: Project } | null;
  goalDialog: { goal?: Goal; defaults?: { project_id?: string } } | null;
  commandOpen: boolean;
  closeTask: () => void;
  closeProject: () => void;
  closeGoal: () => void;
  setCommandOpen: (open: boolean) => void;
}

const Ctx = createContext<AppActions | null>(null);

export function AppActionsProvider({ children }: { children: React.ReactNode }) {
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ project?: Project } | null>(null);
  const [goalDialog, setGoalDialog] = useState<{ goal?: Goal; defaults?: { project_id?: string } } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  const openTask = useCallback((s?: TaskDialogState) => setTaskDialog(s ?? {}), []);
  const openProject = useCallback((project?: Project) => setProjectDialog({ project }), []);
  const openGoal = useCallback((goal?: Goal, defaults?: { project_id?: string }) => setGoalDialog({ goal, defaults }), []);
  const openCommand = useCallback(() => setCommandOpen(true), []);

  const value = useMemo(
    () => ({
      openTask, openProject, openGoal, openCommand, taskDialog, projectDialog, goalDialog, commandOpen,
      closeTask: () => setTaskDialog(null),
      closeProject: () => setProjectDialog(null),
      closeGoal: () => setGoalDialog(null),
      setCommandOpen,
    }),
    [openTask, openProject, openGoal, openCommand, taskDialog, projectDialog, goalDialog, commandOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppActions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppActions must be used inside AppActionsProvider");
  return ctx;
}
