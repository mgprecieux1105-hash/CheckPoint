"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { LightTask, Task, TaskInsert, TaskUpdate } from "@/lib/types";
import { fetchAllPages } from "./fetch-all";
import { qk } from "./keys";

const LIGHT_COLUMNS = "id,status,scheduled_date,project_id,goal_id,category";

/** Whole history, light columns — the single source of truth for every metric. */
export function useAllTasksLight() {
  return useQuery({
    queryKey: qk.tasksLight,
    queryFn: () =>
      fetchAllPages<LightTask>((from, to) =>
        getSupabase().from("tasks").select(LIGHT_COLUMNS).order("scheduled_date").order("id").range(from, to),
      ),
    staleTime: 60_000,
  });
}

export function useTasksForDay(date: string) {
  return useQuery({
    queryKey: qk.tasksDay(date),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("tasks")
        .select("*")
        .eq("scheduled_date", date)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useTasksInRange(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: qk.tasksRange(from, to),
    enabled,
    queryFn: () =>
      fetchAllPages<Task>((a, b) =>
        getSupabase()
          .from("tasks")
          .select("*")
          .gte("scheduled_date", from)
          .lte("scheduled_date", to)
          .order("scheduled_date", { ascending: false })
          .order("created_at")
          .range(a, b),
      ),
  });
}

/** Latest recorded activity: tasks planned up to today, most recent day first. */
export function useRecentTasks(today: string, limit = 8) {
  return useQuery({
    queryKey: [...qk.tasksRecent, today, limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("tasks")
        .select("*")
        .lte("scheduled_date", today)
        .order("scheduled_date", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: qk.tasksProject(projectId),
    queryFn: () =>
      fetchAllPages<Task>((a, b) =>
        getSupabase()
          .from("tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("scheduled_date", { ascending: false })
          .range(a, b),
      ),
  });
}

export function useGoalTasks(goalId: string) {
  return useQuery({
    queryKey: qk.tasksGoal(goalId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("tasks")
        .select("*")
        .eq("goal_id", goalId)
        .order("scheduled_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: qk.task(id ?? "none"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("tasks").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSearchTasks(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: qk.tasksSearch(q),
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc("search_tasks", { p_query: q, p_limit: 50 });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations — optimistic across every cached task list, rollback on failure.
// ---------------------------------------------------------------------------

type Snapshot = [QueryKey, unknown][];

function snapshot(qc: ReturnType<typeof useQueryClient>): Snapshot {
  return qc.getQueriesData({ queryKey: qk.tasks });
}
function restore(qc: ReturnType<typeof useQueryClient>, snap?: Snapshot) {
  snap?.forEach(([key, data]) => qc.setQueryData(key, data));
}
function invalidateDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.tasks });
  qc.invalidateQueries({ queryKey: ["task"] });
  qc.invalidateQueries({ queryKey: qk.notifications });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInsert) => {
      const { data, error } = await getSupabase().from("tasks").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const snap = snapshot(qc);
      const now = new Date().toISOString();
      const temp: Task = {
        id: `temp-${Math.random().toString(36).slice(2)}`,
        user_id: "",
        project_id: input.project_id ?? null,
        goal_id: input.goal_id ?? null,
        title: input.title,
        description: input.description ?? null,
        notes: input.notes ?? null,
        category: input.category ?? null,
        priority: input.priority ?? "medium",
        status: input.status ?? "pending",
        scheduled_date: input.scheduled_date ?? "",
        due_date: input.due_date ?? null,
        completed_at: input.status === "completed" ? now : null,
        is_demo: false,
        created_at: now,
        updated_at: now,
      };
      if (temp.scheduled_date) {
        qc.setQueryData<Task[]>(qk.tasksDay(temp.scheduled_date), (old) => (old ? [...old, temp] : old));
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => invalidateDependents(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskUpdate }) => {
      const { data, error } = await getSupabase().from("tasks").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const snap = snapshot(qc);
      qc.setQueriesData<(Task | LightTask)[]>({ queryKey: qk.tasks }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((t) => (t.id === id ? ({ ...t, ...patch } as typeof t) : t));
      });
      const prevTask = qc.getQueryData<Task>(qk.task(id));
      if (prevTask) qc.setQueryData<Task>(qk.task(id), { ...prevTask, ...patch } as Task);
      return { snap, prevTask };
    },
    onError: (_e, { id }, ctx) => {
      restore(qc, ctx?.snap);
      if (ctx?.prevTask) qc.setQueryData(qk.task(id), ctx.prevTask);
    },
    onSettled: () => invalidateDependents(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const snap = snapshot(qc);
      qc.setQueriesData<(Task | LightTask)[]>({ queryKey: qk.tasks }, (old) =>
        Array.isArray(old) ? old.filter((t) => t.id !== id) : old,
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => invalidateDependents(qc),
  });
}
