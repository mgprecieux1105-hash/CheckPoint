"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Plus, Search } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { getSupabase } from "@/lib/supabase/client";
import { useCalendarContext, useProfile } from "@/lib/data/profile";
import { qk } from "@/lib/data/keys";
import { cn } from "@/lib/utils";
import { AppActionsProvider, useAppActions } from "./app-actions";
import { CommandMenu } from "./command-menu";
import { MAIN_NAV, SETTINGS_NAV, isActive } from "./nav";
import { NotificationsButton } from "./notifications";
import { UserMenu } from "./user-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppActionsProvider>
      <ShellInner>{children}</ShellInner>
    </AppActionsProvider>
  );
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

const SEQUENCES: Record<string, string> = { o: "/overview", t: "/tracker", p: "/projects", b: "/objectives", h: "/history", a: "/analytics", s: "/settings" };

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { openTask, openCommand } = useAppActions();
  const { data: profile } = useProfile();
  const { today } = useCalendarContext();
  const { setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const themeSynced = useRef(false);
  const remindersFor = useRef<string | null>(null);

  // Apply the stored theme preference once per session.
  useEffect(() => {
    if (profile && !themeSynced.current) {
      themeSynced.current = true;
      setTheme(profile.theme);
    }
  }, [profile, setTheme]);

  // Generate deadline reminders (idempotent server-side).
  useEffect(() => {
    if (!profile || remindersFor.current === today) return;
    remindersFor.current = today;
    getSupabase()
      .rpc("generate_due_notifications", { p_today: today })
      .then(({ data }) => {
        if (data && data > 0) qc.invalidateQueries({ queryKey: qk.notifications });
      });
  }, [profile, today, qc]);

  // Evening reminder to write the daily reflection (opt-out in settings).
  useEffect(() => {
    if (!profile) return;
    const prefs = (profile.preferences ?? {}) as { notifications?: { daily_reminder?: boolean } };
    if (prefs.notifications?.daily_reminder === false) return;
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: profile.timezone }).format(new Date()));
    if (hour < 18) return;
    (async () => {
      const sb = getSupabase();
      const [{ count: taskCount }, { data: reflection }] = await Promise.all([
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("scheduled_date", today),
        sb.from("daily_reflections").select("id").eq("reflection_date", today).maybeSingle(),
      ]);
      if (!taskCount || reflection) return;
      const { error } = await sb.from("notifications").upsert({
        user_id: profile.id,
        title: "Clôturez votre journée",
        message: "Prenez une minute pour noter ce qui s'est bien passé et ce que vous améliorerez demain.",
        type: "reminder",
        link: "/tracker",
        dedupe_key: `reflection-${today}`,
      }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
      if (!error) qc.invalidateQueries({ queryKey: qk.notifications });
    })();
  }, [profile, today, qc]);

  // Session expiry → back to login.
  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        qc.clear();
        window.location.assign("/login");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [qc, router]);

  // Keyboard shortcuts: N = new task, G + key = navigation.
  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (pendingG && Date.now() - pendingG < 900 && SEQUENCES[k]) {
        pendingG = 0;
        router.push(SEQUENCES[k]);
        return;
      }
      pendingG = k === "g" ? Date.now() : 0;
      if (k === "n") {
        e.preventDefault();
        openTask();
      } else if (k === "/") {
        e.preventDefault();
        openCommand();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, openTask, openCommand]);

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/overview" aria-label="CheckPoint — vue d'ensemble"><Logo /></Link>
        </div>
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={openCommand}
            className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-[13px] text-muted-foreground transition hover:border-border-strong"
          >
            <Search className="size-4" />
            Rechercher…
            <kbd className="ml-auto rounded border border-border bg-surface px-1.5 text-[10px]">⌘K</kbd>
          </button>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <SidebarLink item={SETTINGS_NAV} active={isActive(pathname, SETTINGS_NAV.href)} />
          <UserMenu />
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:h-16 lg:px-8">
        <Link href="/overview" className="lg:hidden" aria-label="CheckPoint"><LogoMark className="size-7" /></Link>
        <button
          type="button"
          onClick={openCommand}
          className="ml-1 flex h-9 flex-1 items-center gap-2 rounded-[10px] text-[13px] text-muted-foreground sm:max-w-xs lg:hidden"
          aria-label="Rechercher"
        >
          <Search className="size-4" /> <span className="hidden sm:inline">Rechercher…</span>
        </button>
        <div className="flex-1 max-lg:hidden" />
        <Button onClick={() => openTask()} size="sm" className="h-9 max-sm:hidden">
          <Plus /> Nouvel accomplissement
        </Button>
        <Button onClick={() => openTask()} size="icon" className="sm:hidden" aria-label="Nouvelle tâche">
          <Plus />
        </Button>
        <NotificationsButton />
        <div className="lg:hidden"><UserMenu variant="compact" /></div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {MAIN_NAV.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="size-5" />
                <span className="truncate">{item.label.replace("Vue d'ensemble", "Aperçu").replace("Suivi du jour", "Journée")}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium",
              ["/history", "/analytics", "/settings"].some((h) => isActive(pathname, h)) ? "text-primary" : "text-muted-foreground")}>
            <Menu className="size-5" /> Plus
          </button>
        </div>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent title="Menu">
          <div className="grid gap-1">
            {[...MAIN_NAV.slice(4), SETTINGS_NAV].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-surface-hover">
                <item.icon className="size-5 text-muted-foreground" /> {item.label}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <TaskDialog />
      <ProjectDialog />
      <GoalDialog />
      <CommandMenu />
    </div>
  );
}

function SidebarLink({ item, active }: { item: (typeof MAIN_NAV)[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium transition-colors",
        active ? "bg-primary-soft text-primary" : "text-subtle-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <item.icon className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {item.label}
    </Link>
  );
}
