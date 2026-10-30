"use client";

import ErrorCard from "@/components/error-card";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorCard reset={reset} />;
}
