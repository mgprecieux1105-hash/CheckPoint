"use client";

import * as React from "react";
import * as T from "@radix-ui/react-tooltip";

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-lg bg-[#182235] px-2.5 py-1.5 text-xs leading-snug text-white shadow-pop data-[state=delayed-open]:animate-fade-in dark:bg-[#e7ecf5] dark:text-[#0b1020]"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
