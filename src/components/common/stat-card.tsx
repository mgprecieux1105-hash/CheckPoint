import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  footer,
  trend,
  visual,
  hint,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "accent";
  footer?: React.ReactNode;
  trend?: { diff: number; label: string; invert?: boolean } | null;
  visual?: React.ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  const toneBg = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent",
  }[tone];

  const good = trend ? (trend.invert ? trend.diff < 0 : trend.diff > 0) : false;
  const TrendIcon = !trend || trend.diff === 0 ? Minus : trend.diff > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <Tooltip content={hint ?? label}>
          <p className="cursor-default text-[13px] font-medium text-muted-foreground">{label}</p>
        </Tooltip>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", toneBg)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className="text-[26px] sm:text-[30px] font-semibold leading-none tracking-tight tabular">{value}</p>
        )}
        {visual}
      </div>
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {trend && !loading && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              trend.diff === 0 ? "bg-surface-muted text-subtle-foreground" : good ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            <TrendIcon className="size-3" />
            {trend.diff > 0 ? "+" : ""}
            {trend.label}
          </span>
        )}
        {!loading && footer}
      </div>
    </Card>
  );
}
