import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import OnboardingModal from "@/components/onboarding-modal";
import PageTips from "@/components/page-tips";
import { getCurrentUser } from "@/lib/auth";
import { canSeeBand } from "@/lib/band";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { isLeader } from "@/lib/leaderboard";
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
  if (user.mustChangePassword) redirect("/change-password");

  const links: NavLink[] = [{ href: "/dashboard/meetings", label: "Meetings", icon: "meetings" }];
  if (user.crewId || can(user, "crew:approve_membership_change")) {
    links.push({ href: "/dashboard/crew", label: "Crew", icon: "crew" });
  }
  links.push(
    { href: "/dashboard/fieldops", label: "Field Ops", icon: "fieldops" },
    { href: "/dashboard/training", label: "Training", icon: "training" },
    { href: "/dashboard/store", label: "Shop", icon: "store" },
    { href: "/dashboard/pay", label: "Pay", icon: "pay" }
  );
  if (can(user, "finance:manage")) links.push({ href: "/dashboard/finance", label: "Finance", icon: "finance" });
  if (can(user, "user:approve_registration") || can(user, "crew:approve_members")) {
    links.push({ href: "/dashboard/approvals", label: "Approvals", icon: "approvals" });
  }
  if (can(user, "user:manage_titles") || can(user, "user:appoint_admin")) {
    links.push({ href: "/dashboard/people", label: "People", icon: "people" });
  }
  if (can(user, "user:manage_accounts")) links.push({ href: "/dashboard/members", label: "Members", icon: "members" });
  if (canSeeBand(user)) links.push({ href: "/dashboard/band", label: "Band", icon: "band" });
  links.push(
    { href: "/dashboard/articles", label: "Articles", icon: "articles" },
    { href: "/dashboard/documents", label: "Documents", icon: "documents" }
  );
  if (isLeader(user)) links.push({ href: "/dashboard/analytics", label: "Analytics", icon: "analytics" });
  links.push(
    { href: "/dashboard/scan", label: "Check in", icon: "scan" },
    { href: "/dashboard/notifications", label: "Notifications", icon: "bell" },
    { href: "/dashboard/attendance", label: "Attendance", icon: "attendance" },
    { href: "/dashboard/profile", label: "My profile", icon: "profile" }
  );

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

  const needsTour = !user.hasCompletedOnboarding && !user.isDeveloper;
  const first = user.fullName.trim().split(/\s+/)[0] ?? "";
  const firstName = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "there";

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
      {needsTour && (
        <OnboardingModal
          firstName={firstName}
          crewName={user.crewId ? crewName(user.crewId) : null}
          crewColor={crewColor(user.crewId)}
        />
      )}
      <PageTips userId={user.id} enabled={!needsTour} />
    </div>
  );
}
