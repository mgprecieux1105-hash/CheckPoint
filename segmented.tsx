"use client";

import { cn } from "@/lib/utils";

/** Compact segmented control (period selectors, view switches). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex rounded-[10px] bg-surface-muted p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg font-medium text-muted-foreground transition-all hover:text-foreground",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            value === o.value && "bg-surface text-foreground shadow-card",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
