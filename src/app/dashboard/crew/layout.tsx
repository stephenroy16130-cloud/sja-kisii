import type { ReactNode } from "react";
import AnnouncementManager from "@/components/announcement-manager";

export default function CrewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-10">
      {children}
      <AnnouncementManager />
    </div>
  );
}
