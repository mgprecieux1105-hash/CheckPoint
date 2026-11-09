import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-side authorization (the middleware also guards these routes).
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
