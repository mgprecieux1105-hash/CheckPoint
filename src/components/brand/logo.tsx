import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="22" r="3" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && <span className="text-[17px] font-semibold tracking-tight">CheckPoint</span>}
    </span>
  );
}
