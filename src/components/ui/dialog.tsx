"use client";

import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  hideClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[#0b1020]/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface shadow-modal data-[state=open]:animate-scale-in focus:outline-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-1">
          <div>
            <D.Title className="text-[17px] font-semibold tracking-tight">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          {!hideClose && (
            <D.Close className="-mr-2 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" aria-label="Fermer">
              <X className="size-4" />
            </D.Close>
          )}
        </div>
        <div className="overflow-y-auto px-6 pt-3 pb-6">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>{children}</div>;
}
