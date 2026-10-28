import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import LogoutButton from "./logout-button";
import NavLinks from "./nav-links";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links = [{ href: "/dashboard", label: "Overview" }];
  if (can(user, "user:approve_registration") || can(user, "crew:approve_members")) {
    links.push({ href: "/dashboard/approvals", label: "Approvals" });
  }
  if (can(user, "user:manage_titles")) {
    links.push({ href: "/dashboard/people", label: "People" });
  }

  const role = user.isDeveloper
    ? "Developer"
    : user.isSuperintendent
      ? "Divisional Superintendent"
      : user.titles.length
        ? user.titles.map((t) => t.replace(/_/g, " ")).join(" · ")
        : "Member";

  return (
    <div className="min-h-screen bg-white">
      <aside className="sticky top-0 z-20 bg-black text-white lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:w-72 lg:flex-col lg:p-8">
        <div className="flex items-center justify-between px-4 pt-4 lg:block lg:p-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="text-2xl leading-none">✳</span>
            <span className="text-sm leading-tight text-white/80">
              St. John Ambulance
              <br />
              Kisii University
            </span>
          </Link>
          <div className="lg:hidden">
            <LogoutButton />
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 lg:mt-12 lg:flex-1 lg:p-0">
          <NavLinks links={links} />
        </div>

        <div className="hidden border-t border-white/15 pt-6 lg:block">
          <p className="font-medium">{user.fullName}</p>
          <p className="mb-4 mt-1 text-xs uppercase tracking-wide text-white/50">{role}</p>
          <LogoutButton />
        </div>
      </aside>

      <main className="lg:pr-72">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
