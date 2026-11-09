"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useProfile, useUpdateProfile } from "@/lib/data/profile";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

export function Avatar({ name, email, className }: { name?: string | null; email?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3978F6] to-[#25C8C4] text-xs font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {initials(name, email)}
    </span>
  );
}

export function UserMenu({ variant = "sidebar" }: { variant?: "sidebar" | "compact" }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { setTheme } = useTheme();
  const updateProfile = useUpdateProfile();

  const changeTheme = (theme: "light" | "dark" | "system") => {
    setTheme(theme);
    updateProfile.mutate({ theme });
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
    qc.clear();
    // Full navigation: drops every client cache tied to the previous session.
    window.location.assign("/login");
  };

  return (
    <Dropdown>
      <DropdownTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-surface-hover",
          variant === "sidebar" ? "w-full p-2" : "p-1",
        )}
        aria-label="Menu du compte"
      >
        <Avatar name={profile?.full_name} email={profile?.email} />
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{profile?.full_name || "Mon compte"}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile?.email}</span>
          </span>
        )}
      </DropdownTrigger>
      <DropdownContent align={variant === "sidebar" ? "start" : "end"} className="w-56">
        <DropdownItem asChild>
          <Link href="/settings"><User /> Profil</Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/settings#preferences"><Settings /> Réglages</Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownLabel>Thème</DropdownLabel>
        <DropdownItem onSelect={() => changeTheme("light")}><Sun /> Clair</DropdownItem>
        <DropdownItem onSelect={() => changeTheme("dark")}><Moon /> Sombre</DropdownItem>
        <DropdownItem onSelect={() => changeTheme("system")}><Monitor /> Système</DropdownItem>
        <DropdownSeparator />
        <DropdownItem onSelect={signOut}><LogOut /> Se déconnecter</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
