import { crewName } from "@/lib/crews";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, permissionsFor } from "@/lib/rbac";
import GenesisForm from "./genesis-form";
import RegistrationToggle from "./registration-toggle";

export const dynamic = "force-dynamic";

const pretty = (t: string) => t.replace(/_/g, " ");

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const perms = [...permissionsFor(user)];
  const setting = await db.systemSetting.findUnique({ where: { key: "registrationOpen" } });
  const registrationOpen = setting?.value === true;

  const badges: string[] = [];
  if (user.isDeveloper) badges.push("Developer");
  if (user.isSuperintendent) badges.push("Divisional Superintendent");
  user.titles.forEach((t) => badges.push(pretty(t)));
  if (badges.length === 0) badges.push("Member");

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden bg-black p-8 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,148,43,0.35),transparent_60%)]" />
        <div className="relative">
          <p className="text-sm text-neutral-400">Welcome</p>
          <h1 className="mt-1 text-4xl font-light tracking-tight">{user.fullName}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="border border-white/40 px-3 py-1 text-xs uppercase tracking-wide">{b}</span>
            ))}
            {user.crewId && (
              <span className="bg-amber-400 px-3 py-1 text-xs font-medium uppercase tracking-wide text-black">
                {crewName(user.crewId)}
              </span>
            )}
          </div>
        </div>
      </section>

      {user.isDeveloper && (
        <section className="border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-light">System setup</h2>
          <p className="mb-6 mt-1 text-sm text-neutral-500">
            Create the first Divisional Superintendent. This can only be done once.
          </p>
          <GenesisForm />
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {can(user, "user:manage_accounts") && (
          <section className="border border-neutral-200 bg-white p-6">
            <h2 className="mb-3 text-xl font-light">Registration</h2>
            <RegistrationToggle initialOpen={registrationOpen} />
          </section>
        )}
        {(can(user, "user:approve_registration") || can(user, "crew:approve_members")) && (
          <section className="border border-neutral-200 bg-white p-6">
            <h2 className="mb-3 text-xl font-light">Approvals</h2>
            <p className="mb-3 text-sm text-neutral-500">Review members waiting to join.</p>
            <Link href="/dashboard/approvals" className="text-sm underline">Open approvals</Link>
          </section>
        )}
        {can(user, "user:manage_titles") && (
          <section className="border border-neutral-200 bg-white p-6">
            <h2 className="mb-3 text-xl font-light">People and titles</h2>
            <p className="mb-3 text-sm text-neutral-500">Create leader accounts, promote and demote.</p>
            <Link href="/dashboard/people" className="text-sm underline">Manage people</Link>
          </section>
        )}
      </div>

      <section className="border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-light">Your permissions</h2>
        <p className="mb-4 mt-1 text-sm text-neutral-500">Calculated live from your titles.</p>
        {perms.length === 0 ? (
          <p className="text-sm text-neutral-500">None. You have standard member access.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {perms.map((p) => (
              <span key={p} className="bg-neutral-100 px-2 py-1 font-mono text-xs">{p}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
