import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import LogoutButton from "./logout-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canReview = can(user, "user:approve_registration") || can(user, "crew:approve_members");
  const canPeople = can(user, "user:manage_titles");
  const link = "rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-white";

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 px-4 pt-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full bg-ink px-5 py-3 text-white shadow-lg">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl leading-none text-glow">✳</span>
              <span className="hidden text-sm sm:inline">St. John Ambulance</span>
            </Link>
            <nav className="flex gap-1 text-sm text-white/70">
              <Link href="/dashboard" className={link}>Overview</Link>
              {canReview && <Link href="/dashboard/approvals" className={link}>Approvals</Link>}
              {canPeople && <Link href="/dashboard/people" className={link}>People</Link>}
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
