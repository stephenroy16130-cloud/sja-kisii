import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import Badge from "@/components/badge";
import HallOfFame from "@/components/hall-of-fame";
import TrophyBadge from "@/components/trophy-badge";
import TrophyCase from "@/components/trophy-case";
import { getCurrentUser } from "@/lib/auth";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { loadMotw } from "@/lib/motw";
import { can, permissionsFor } from "@/lib/rbac";
import GenesisForm from "./genesis-form";
import RegistrationToggle from "./registration-toggle";

export const dynamic = "force-dynamic";

const TOTAL_PERMS = 20;
const pretty = (t: string) => t.replace(/_/g, " ");
const card = "rounded-3xl border border-white/10 bg-card p-6";
const label = "flex items-center gap-2 text-sm text-white/50";
const bigNum = "mt-2 text-5xl font-light tracking-tight";
const linkBtn =
  "mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const perms = [...permissionsFor(user)];
  const canApprove = can(user, "user:approve_registration") || can(user, "crew:approve_members");
  const canManage = can(user, "user:manage_titles");

  const filters: Prisma.UserWhereInput[] = [];
  if (can(user, "user:approve_registration")) filters.push({ status: "PENDING_ADMIN" });
  if (can(user, "crew:approve_members") && user.crewId) {
    filters.push({ status: "PENDING_CREW", crewId: user.crewId });
  }

  const [motw, setting, pending, members] = await Promise.all([
    loadMotw(user.id),
    db.systemSetting.findUnique({ where: { key: "registrationOpen" } }),
    filters.length ? db.user.count({ where: { OR: filters } }) : Promise.resolve(0),
    canManage
      ? db.user.count({ where: { status: "ACTIVE", isSuperintendent: false, isDeveloper: false } })
      : Promise.resolve(0),
  ]);
  const registrationOpen = setting?.value === true;

  const badges: string[] = [];
  if (user.isDeveloper) badges.push("Developer");
  if (user.isSuperintendent) badges.push("Divisional Superintendent");
  user.titles.forEach((t) => badges.push(pretty(t)));
  if (badges.length === 0) badges.push("Member");

  const pct = Math.min(100, Math.round((perms.length / TOTAL_PERMS) * 100));
  const color = crewColor(user.crewId);

  return (
    <div className="space-y-4">
      <section className="vignette-dark relative overflow-hidden rounded-3xl border border-white/10 p-7 md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/10" />
        <div className="absolute right-6 top-6">
          <Badge size={72} />
        </div>
        <div className="relative">
          <p className="font-copy text-base italic text-gold">Welcome back</p>
          <h1 className="mt-2 flex max-w-[75%] flex-wrap items-center gap-3 text-3xl font-light leading-tight tracking-tight md:text-5xl">
            {user.fullName}
            <TrophyBadge count={motw.myWins} size={44} />
          </h1>
          <p className="mt-2 text-sm text-white/50">Small steps, big service.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="rounded-full border border-gold/50 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.15em]">
                {b}
              </span>
            ))}
            {user.crewId && (
              <span
                className="rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-black"
                style={{ backgroundColor: color }}
              >
                {crewName(user.crewId)}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className={card} style={{ borderColor: user.crewId ? `${color}66` : undefined }}>
          <p className={label}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            Crew
          </p>
          <p className="mt-2 text-xl font-light leading-snug">{user.crewId ? crewName(user.crewId) : "None"}</p>
          <p className="mt-3 text-xs text-white/40">Your division crew</p>
        </section>
        <section className={card}>
          <p className={label}>
            <span className="h-2 w-2 rounded-full bg-gold" />
            Permissions
          </p>
          <p className={bigNum}>
            {perms.length}
            <span className="ml-1 text-sm text-white/40">of {TOTAL_PERMS}</span>
          </p>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
        </section>
      </div>

      <HallOfFame data={motw.hall} meId={user.id} />
      <TrophyCase wins={motw.myWins} history={motw.myHistory} week={motw.myWeek} />

      {user.isDeveloper && (
        <section className={card}>
          <h2 className="text-xl font-light">System setup</h2>
          <p className="mb-6 mt-1 text-sm text-white/50">
            Create the first Divisional Superintendent. This can only be done once.
          </p>
          <GenesisForm />
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {can(user, "user:manage_accounts") && (
          <section className={card}>
            <p className={label}>
              <span className={`h-2 w-2 rounded-full ${registrationOpen ? "bg-ok" : "bg-bad"}`} />
              Registration
            </p>
            <div className="mt-3">
              <RegistrationToggle initialOpen={registrationOpen} />
            </div>
          </section>
        )}
        {canApprove && (
          <section className={card}>
            <p className={label}>
              <span className="h-2 w-2 rounded-full bg-warn" />
              Waiting for approval
            </p>
            <p className={`${bigNum} ${pending > 0 ? "text-warn" : ""}`}>{pending}</p>
            <p className="mt-1 text-xs text-white/40">{pending === 0 ? "All caught up" : "members need a decision"}</p>
            <Link href="/dashboard/approvals" className={linkBtn}>Open approvals</Link>
          </section>
        )}
        {canManage && (
          <section className={card}>
            <p className={label}>
              <span className="h-2 w-2 rounded-full bg-ok" />
              Active members
            </p>
            <p className={bigNum}>{members}</p>
            <p className="mt-1 text-xs text-white/40">promote or demote titles</p>
            <Link href="/dashboard/people" className={linkBtn}>Manage people</Link>
          </section>
        )}
      </div>

      <section className={card}>
        <h2 className="text-xl font-light">Your permissions</h2>
        <p className="mb-5 mt-1 text-sm text-white/50">Calculated live from your titles.</p>
        {perms.length === 0 ? (
          <p className="text-sm text-white/50">None. You have standard member access.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {perms.map((p) => (
              <span key={p} className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px]">{p}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
