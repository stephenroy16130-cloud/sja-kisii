import type { ReactNode } from "react";
import DivisionAttendance from "@/components/division-attendance";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { isLeader } from "@/lib/leaderboard";

export default async function AnalyticsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isLeader(user)) return <>{children}</>;

  // DOs and the Superintendent see every crew. Sergeants, Corporals and the rest see their own crew.
  const wide = user.isSuperintendent || user.titles.some((t) => t.startsWith("DO_"));
  if (!wide && !user.crewId) return <>{children}</>;

  return (
    <div className="space-y-12">
      {children}
      <DivisionAttendance crewId={wide ? null : user.crewId} scope={wide ? "All crews" : crewName(user.crewId)} />
    </div>
  );
}
