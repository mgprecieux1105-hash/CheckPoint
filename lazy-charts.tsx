"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is loaded on demand so the first paint of every page stays light.
const loading = () => <Skeleton className="h-[240px] w-full" />;

export const PerformanceChart = dynamic(() => import("./charts").then((m) => m.PerformanceChart), { ssr: false, loading });
export const RateChart = dynamic(() => import("./charts").then((m) => m.RateChart), { ssr: false, loading });
export const WeekdayChart = dynamic(() => import("./charts").then((m) => m.WeekdayChart), { ssr: false, loading });
