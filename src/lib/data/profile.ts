"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { todayInTimeZone, type WeekStart } from "@/lib/dates";
import type { Profile } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";
import { qk } from "./keys";

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async (): Promise<Profile> => {
      const sb = getSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error("Session expirée");
      const { data, error } = await sb.from("profiles").select("*").eq("id", auth.user.id).single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Database["public"]["Tables"]["profiles"]["Update"]) => {
      const sb = getSupabase();
      const current = qc.getQueryData<Profile>(qk.profile);
      const id = current?.id ?? (await sb.auth.getUser()).data.user?.id;
      if (!id) throw new Error("Session expirée");
      const { data, error } = await sb.from("profiles").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.profile });
      const prev = qc.getQueryData<Profile>(qk.profile);
      if (prev) qc.setQueryData<Profile>(qk.profile, { ...prev, ...patch } as Profile);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.profile, ctx.prev),
    onSuccess: (data) => qc.setQueryData(qk.profile, data),
  });
}

/** Calendar context of the signed-in user: today in their time zone and week start. */
export function useCalendarContext() {
  const { data } = useProfile();
  const timeZone = data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    today: todayInTimeZone(timeZone),
    timeZone,
    weekStartsOn: (data?.week_starts_on ?? 1) as WeekStart,
  };
}
