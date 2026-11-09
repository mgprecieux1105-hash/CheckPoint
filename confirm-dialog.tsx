"use client";

import * as React from "react";
import * as A from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Supprimer",
  onConfirm,
  destructive = true,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <A.Root open={open} onOpenChange={onOpenChange}>
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-50 bg-[#0b1020]/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <A.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-modal data-[state=open]:animate-scale-in">
          <A.Title className="text-[17px] font-semibold tracking-tight">{title}</A.Title>
          <A.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</A.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <A.Cancel asChild>
              <Button variant="secondary">Annuler</Button>
            </A.Cancel>
            <Button
              variant={destructive ? "danger" : "primary"}
              loading={loading}
              onClick={async (e) => {
                e.preventDefault();
                await onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
