import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackerView } from "@/components/tracker/tracker-view";

export const metadata: Metadata = { title: "Suivi du jour" };

export default function TrackerPage() {
  return (
    <Suspense>
      <TrackerView />
    </Suspense>
  );
}
