import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import NavShell, { type NavLink } from "./nav-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links: NavLink[] = [{ href: "/dashboard", label: "Overview" }];
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
    <div className="min-h-screen">
      <NavShell links={links} name={user.fullName} role={role} />
      <main className="vignette-light min-h-screen lg:pr-72">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
