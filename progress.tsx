import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  color = "var(--primary)",
  label,
}: {
  value: number;
  className?: string;
  color?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
    >
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = "var(--primary)",
  children,
  label,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}
      role="img" aria-label={label ?? (value === null ? "Aucune donnée" : `${Math.round(v)} %`)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
