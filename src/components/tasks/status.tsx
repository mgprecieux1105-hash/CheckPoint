import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITIES, TASK_STATUS } from "@/lib/constants";
import type { Priority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const s = TASK_STATUS[status];
  const Icon = status === "completed" ? CheckCircle2 : status === "missed" ? XCircle : Circle;
  return (
    <Badge tone={s.tone}>
      <Icon /> {s.label}
    </Badge>
  );
}

export function PriorityFlag({ priority, showLabel, className }: { priority: Priority; showLabel?: boolean; className?: string }) {
  const p = PRIORITIES.find((x) => x.value === priority)!;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)} title={`Priorité ${p.label.toLowerCase()}`}>
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((bar) => {
          const level = { low: 1, medium: 2, high: 3, urgent: 3 }[priority];
          return (
            <span key={bar} className="w-[3px] rounded-sm" style={{
              height: `${bar * 4}px`,
              background: bar <= level ? p.color : "var(--border-strong)",
            }} />
          );
        })}
      </span>
      {showLabel && p.label}
      <span className="sr-only">Priorité {p.label}</span>
    </span>
  );
}
