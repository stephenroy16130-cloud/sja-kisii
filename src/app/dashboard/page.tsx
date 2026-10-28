import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { can, permissionsFor } from "@/lib/rbac";
import GenesisForm from "./genesis-form";
import RegistrationToggle from "./registration-toggle";

export const dynamic = "force-dynamic";

const pretty = (t: string) => t.replace(/_/g, " ");
const card = "border border-neutral-300 bg-white p-7";
const cardTitle = "heading accent-bar mb-4 text-sm";
const desc = "font-copy mb-5 text-sm leading-relaxed text-neutral-600";
const linkBtn =
  "inline-block border border-black px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition hover:bg-black hover:text-white";

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
      <section className="vignette-dark relative overflow-hidden p-8 text-white md:p-14">
        <div className="pointer-events-none absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-16 -top-8 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative">
          <p className="font-copy text-lg italic text-white/70">Welcome back</p>
          <h1 className="heading mt-3 text-2xl leading-snug md:text-4xl">{user.fullName}</h1>
          <div className="mt-8 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="border border-white/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]">
                {b}
              </span>
            ))}
            {user.crewId && (
              <span className="bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-black">
                {crewName(user.crewId)}
              </span>
            )}
          </div>
        </div>
      </section>

      {user.isDeveloper && (
        <section className={card}>
          <h2 className={cardTitle}>System setup</h2>
          <p className={desc}>Create the first Divisional Superintendent. This can only be done once.</p>
          <GenesisForm />
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {can(user, "user:manage_accounts") && (
          <section className={card}>
            <h2 className={cardTitle}>Registration</h2>
            <RegistrationToggle initialOpen={registrationOpen} />
          </section>
        )}
        {(can(user, "user:approve_registration") || can(user, "crew:approve_members")) && (
          <section className={card}>
            <h2 className={cardTitle}>Approvals</h2>
            <p className={desc}>Review members waiting to join.</p>
            <Link href="/dashboard/approvals" className={linkBtn}>Open ›</Link>
          </section>
        )}
        {can(user, "user:manage_titles") && (
          <section className={card}>
            <h2 className={cardTitle}>People and titles</h2>
            <p className={desc}>Create leader accounts, promote and demote.</p>
            <Link href="/dashboard/people" className={linkBtn}>Manage ›</Link>
          </section>
        )}
      </div>

      <section className="bg-black p-7 text-white">
        <h2 className="heading accent-bar mb-4 text-sm">Your permissions</h2>
        <p className="font-copy mb-5 text-sm text-white/60">Calculated live from your titles.</p>
        {perms.length === 0 ? (
          <p className="font-copy text-sm text-white/60">None. You have standard member access.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {perms.map((p) => (
              <span key={p} className="border border-white/30 px-3 py-1 font-mono text-[11px]">{p}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
