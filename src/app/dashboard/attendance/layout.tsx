import type { ReactNode } from "react";
import AttendanceInsights from "@/components/attendance-insights";
import { getCurrentUser } from "@/lib/auth";

export default async function AttendanceLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="space-y-10">
      {user && !user.isDeveloper && <AttendanceInsights userId={user.id} />}
      {children}
    </div>
  );
}
