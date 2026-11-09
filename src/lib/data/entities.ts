"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { AppNotification, Goal, Milestone, Project, Reflection } from "@/lib/types";
import { fetchAllPages } from "./fetch-all";
import { qk } from "./keys";

type T = Database["public"]["Tables"];

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("projects").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useProjectMap() {
  const { data } = useProjects();
  return new Map((data ?? []).map((p) => [p.id, p] as const));
}

function useListMutations<Row extends { id: string }, Insert, Update>(table: "projects" | "goals" | "milestones", key: QueryKey, extraInvalidate: QueryKey[] = []) {
  const qc = useQueryClient();
  const settle = () => {
    qc.invalidateQueries({ queryKey: key });
    extraInvalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  const create = useMutation({
    mutationFn: async (input: Insert) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (getSupabase().from(table) as any).insert(input).select("*").single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (row) => qc.setQueryData<Row[]>(key, (old) => (old ? [...old, row] : old)),
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (getSupabase().from(table) as any).update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as Row;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Row[]>(key);
      qc.setQueryData<Row[]>(key, (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Row[]>(key);
      qc.setQueryData<Row[]>(key, (old) => old?.filter((r) => r.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: settle,
  });

  return { create, update, remove };
}

export function useProjectMutations() {
  return useListMutations<Project, T["projects"]["Insert"], T["projects"]["Update"]>("projects", qk.projects, [qk.tasks, qk.goals]);
}

// ---------------------------------------------------------------------------
// Goals & milestones
// ---------------------------------------------------------------------------
export function useGoals() {
  return useQuery({
    queryKey: qk.goals,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("goals").select("*").order("target_date");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useGoalMap() {
  const { data } = useGoals();
  return new Map((data ?? []).map((g) => [g.id, g] as const));
}

export function useGoalMutations() {
  return useListMutations<Goal, T["goals"]["Insert"], T["goals"]["Update"]>("goals", qk.goals, [qk.tasks, qk.notifications, qk.milestones]);
}

export function useMilestones() {
  return useQuery({
    queryKey: qk.milestones,
    queryFn: () =>
      fetchAllPages<Milestone>((a, b) =>
        getSupabase().from("milestones").select("*").order("position").order("created_at").range(a, b),
      ),
    staleTime: 60_000,
  });
}

/** Milestones grouped by goal id. */
export function useMilestonesByGoal() {
  const { data } = useMilestones();
  const map = new Map<string, Milestone[]>();
  for (const m of data ?? []) {
    const list = map.get(m.goal_id);
    if (list) list.push(m);
    else map.set(m.goal_id, [m]);
  }
  return map;
}

export function useMilestoneMutations() {
  return useListMutations<Milestone, T["milestones"]["Insert"], T["milestones"]["Update"]>("milestones", qk.milestones);
}

// ---------------------------------------------------------------------------
// Daily reflections
// ---------------------------------------------------------------------------
export function useReflection(date: string) {
  return useQuery({
    queryKey: qk.reflection(date),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("daily_reflections")
        .select("*")
        .eq("reflection_date", date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useReflectionsInRange(from: string, to: string) {
  return useQuery({
    queryKey: qk.reflectionsRange(from, to),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("daily_reflections")
        .select("id,reflection_date,mood")
        .gte("reflection_date", from)
        .lte("reflection_date", to);
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveReflection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<T["daily_reflections"]["Insert"], "user_id">) => {
      const { data: auth } = await getSupabase().auth.getUser();
      if (!auth.user) throw new Error("Session expirée");
      const { data, error } = await getSupabase()
        .from("daily_reflections")
        .upsert({ ...input, user_id: auth.user.id }, { onConflict: "user_id,reflection_date" })
        .select("*")
        .single();
      if (error) throw error;
      return data as Reflection;
    },
    onSuccess: (row) => {
      qc.setQueryData(qk.reflection(row.reflection_date), row);
      qc.invalidateQueries({ queryKey: qk.reflections });
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60_000,
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const patchCache = (fn: (list: AppNotification[]) => AppNotification[]) =>
    qc.setQueryData<AppNotification[]>(qk.notifications, (old) => (old ? fn(old) : old));

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await getSupabase().from("notifications").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onMutate: (ids) => patchCache((l) => l.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => patchCache((l) => l.filter((n) => n.id !== id)),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });

  return { markRead, dismiss };
}

// ---------------------------------------------------------------------------
// Workspace-level RPCs
// ---------------------------------------------------------------------------
export function useDemoWorkspace() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries();
  const seed = useMutation({
    mutationFn: async (today: string) => {
      const { error } = await getSupabase().rpc("seed_demo_workspace", { p_today: today });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().rpc("clear_demo_workspace");
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { seed, clear };
}
