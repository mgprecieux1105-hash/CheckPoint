"use client";

import * as React from "react";
import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({
  children,
  className,
  align = "end",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={8}
        className={cn("z-50 rounded-2xl border border-border bg-surface shadow-pop data-[state=open]:animate-scale-in focus:outline-none", className)}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
