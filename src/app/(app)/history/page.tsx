import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryView } from "@/components/history/history-view";

export const metadata: Metadata = { title: "Historique" };

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryView />
    </Suspense>
  );
}
