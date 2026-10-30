import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { canSeeBand } from "@/lib/band";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { socialPhoto } from "@/lib/profile";
import { can } from "@/lib/rbac";
import DevSwitcher, { type DevUser } from "./dev-switcher";
import NavShell, { type NavLink } from "./nav-shell";

const roleLabel = (u: { isDeveloper: boolean; isSuperintendent: boolean; titles: string[] }) =>
  u.isDeveloper
    ? "Developer"
    : u.isSuperintendent
      ? "Divisional Superintendent"
      : u.titles.length
        ? u.titles.map((t) => t.replace(/_/g, " ")).join(" · ")
        : "Member";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links: NavLink[] = [{ href: "/dashboard/meetings", label: "Meetings", icon: "meetings" }];
  if (user.crewId || can(user, "crew:approve_membership_change")) {
    links.push({ href: "/dashboard/crew", label: "Crew", icon: "crew" });
  }
  links.push(
    { href: "/dashboard/fieldops", label: "Field Ops", icon: "fieldops" },
    { href: "/dashboard/training", label: "Training", icon: "training" },
    { href: "/dashboard/store", label: "Store", icon: "store" }
  );
  if (can(user, "user:approve_registration") || can(user, "crew:approve_members")) {
    links.push({ href: "/dashboard/approvals", label: "Approvals", icon: "approvals" });
  }
  if (can(user, "user:manage_titles")) links.push({ href: "/dashboard/people", label: "People", icon: "people" });
  if (can(user, "user:manage_accounts")) links.push({ href: "/dashboard/members", label: "Members", icon: "members" });
  if (canSeeBand(user)) links.push({ href: "/dashboard/band", label: "Band", icon: "band" });
  links.push(
    { href: "/dashboard/articles", label: "Articles", icon: "articles" },
    { href: "/dashboard/documents", label: "Documents", icon: "documents" }
  );
  links.push({ href: "/dashboard/profile", label: "My profile", icon: "profile" });

  // Developer Quick Switch: development only
  let devUsers: DevUser[] = [];
  if (process.env.NODE_ENV !== "production") {
    const rows = await db.user.findMany({
      where: { email: { endsWith: "@test.com" }, status: "ACTIVE" },
      orderBy: [{ isSuperintendent: "desc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, isDeveloper: true, isSuperintendent: true, titles: true },
    });
    devUsers = rows.map((r) => ({ id: r.id, fullName: r.fullName, role: roleLabel(r) }));
  }

  return (
    <div className="min-h-screen bg-black">
      <NavShell
        links={links}
        name={user.fullName}
        role={roleLabel(user)}
        crew={user.crewId ? crewName(user.crewId) : ""}
        photo={socialPhoto(user)}
      />
      <main className="lg:pr-72">
        <div className="mx-auto max-w-4xl px-4 pb-36 pt-4 lg:px-10 lg:pb-12 lg:pt-12">{children}</div>
      </main>
      {devUsers.length > 0 && <DevSwitcher users={devUsers} currentId={user.id} />}
    </div>
  );
}
