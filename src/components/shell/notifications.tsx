"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationMutations, useNotifications } from "@/lib/data/entities";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  reminder: "bg-primary",
  info: "bg-accent",
};

export function NotificationsButton() {
  const { data = [] } = useNotifications();
  const { markRead, dismiss } = useNotificationMutations();
  const unread = data.filter((n) => !n.is_read);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread.length ? ` (${unread.length} non lues)` : ""}`} className="relative">
          <Bell />
          {unread.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markRead.mutate(unread.map((n) => n.id))}>
              <CheckCheck /> Tout marquer comme lu
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {data.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          ) : (
            data.map((n) => {
              const body = (
                <>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-border-strong" : DOT[n.type])} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px]", n.is_read ? "text-subtle-foreground" : "font-medium")}>{n.title}</span>
                    {n.message && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{n.message}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </span>
                </>
              );
              return (
                <div key={n.id} className="group relative flex border-b border-border last:border-0 hover:bg-surface-hover">
                  {n.link ? (
                    <PopoverClose asChild>
                      <Link href={n.link} className="flex flex-1 gap-3 px-4 py-3" onClick={() => !n.is_read && markRead.mutate([n.id])}>
                        {body}
                      </Link>
                    </PopoverClose>
                  ) : (
                    <button type="button" className="flex flex-1 gap-3 px-4 py-3 text-left" onClick={() => !n.is_read && markRead.mutate([n.id])}>
                      {body}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Supprimer la notification"
                    onClick={() => dismiss.mutate(n.id)}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-surface-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
