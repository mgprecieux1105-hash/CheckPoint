import {
  BookOpen, Briefcase, Camera, Code, Dumbbell, Folder, Globe, GraduationCap, Heart, Home, Leaf, Music,
  Palette, Rocket, Sparkles, Target, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICONS: Record<string, LucideIcon> = {
  folder: Folder, "graduation-cap": GraduationCap, briefcase: Briefcase, rocket: Rocket, dumbbell: Dumbbell,
  heart: Heart, "book-open": BookOpen, code: Code, palette: Palette, home: Home, music: Music, camera: Camera,
  globe: Globe, sparkles: Sparkles, target: Target, leaf: Leaf,
};

export function ProjectIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Folder;
  const box = size === "sm" ? "size-6 rounded-md" : size === "lg" ? "size-11 rounded-xl" : "size-8 rounded-lg";
  const ic = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", box, className)}
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <Icon className={ic} />
    </span>
  );
}

export function ProjectDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: color }} />;
}
