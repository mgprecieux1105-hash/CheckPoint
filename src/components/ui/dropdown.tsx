"use client";

import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-48 rounded-xl border border-border bg-surface p-1 shadow-pop data-[state=open]:animate-scale-in",
          className,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function DropdownItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive && "text-danger [&_svg]:text-danger data-[highlighted]:bg-danger-soft",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <M.Label className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{children}</M.Label>;
}

export function DropdownSeparator() {
  return <M.Separator className="my-1 h-px bg-border" />;
}
