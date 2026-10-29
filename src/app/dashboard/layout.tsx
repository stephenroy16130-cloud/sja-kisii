import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { can } from "@/lib/rbac";
import NavShell, { type NavLink } from "./nav-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links: NavLink[] = [];
  if (can(user, "user:approve_registration") || can(user, "crew:approve_members")) {
    links.push({ href: "/dashboard/approvals", label: "Approvals", icon: "approvals" });
  }
  if (can(user, "user:manage_titles")) {
    links.push({ href: "/dashboard/people", label: "People", icon: "people" });
  }

  const role = user.isDeveloper
    ? "Developer"
    : user.isSuperintendent
      ? "Divisional Superintendent"
      : user.titles.length
        ? user.titles.map((t) => t.replace(/_/g, " ")).join(" · ")
        : "Member";

  return (
    <div className="min-h-screen bg-black">
      <NavShell
        links={links}
        name={user.fullName}
        role={role}
        crew={user.crewId ? crewName(user.crewId) : ""}
      />
      <main className="lg:pr-72">
        <div className="mx-auto max-w-4xl px-4 pb-36 pt-4 lg:px-10 lg:pb-12 lg:pt-12">{children}</div>
      </main>
    </div>
  );
}
