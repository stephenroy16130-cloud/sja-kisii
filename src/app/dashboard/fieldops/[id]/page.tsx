import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CrewTargets from "@/components/crew-targets";
import { getCurrentUser } from "@/lib/auth";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { LEADER_TITLES, opPhase, targetCrewIds, type OpPhase } from "@/lib/fieldops";
import { fmt, hasStarted } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import FieldOpRoster, { type RosterMember } from "./fieldop-roster";

export const dynamic = "force-dynamic";

const card = "rounded-3xl border border-white/10 bg-card p-6";
const h2 = "text-xl font-light";
const phaseTone: Record<OpPhase, string> = {
  UPCOMING: "border-gold/50 text-gold",
  LIVE: "border-ok/50 text-ok",
  PAST: "border-white/20 text-white/50",
};
const phaseWord: Record<OpPhase, string> = { UPCOMING: "Upcoming", LIVE: "Happening now", PAST: "Completed" };

export default async function FieldOpPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const op = await db.fieldOp.findUnique({ where: { id }, include: { crews: { select: { id: true } } } });
  if (!op) notFound();

  const canManage = can(user, "fieldop:manage");
  const targets = targetCrewIds(op);
  const myCrew = user.crewId;
  if (!canManage && !(myCrew && targets.includes(myCrew))) notFound();

  const now = new Date();
  const started = hasStarted(op.startsAt, now);
  const phase = opPhase(op.startsAt, op.endsAt, now);
  const isLeader = can(user, "crew:record_attendance") && myCrew !== null;

  const myRecord = await db.attendanceRecord.findUnique({
    where: { userId_fieldOpId: { userId: user.id, fieldOpId: id } },
    select: { status: true },
  });

  // Crews whose leaders are already marked present (they record for themselves)
  const leaderRecs =
    isLeader || canManage
      ? await db.attendanceRecord.findMany({
          where: { fieldOpId: id, status: "PRESENT", user: { titles: { hasSome: LEADER_TITLES } } },
          select: { crewId: true },
        })
      : [];
  const leaderPresent = new Set(leaderRecs.map((r) => r.crewId));

  // Which crews this leader can record: their own, plus override crews with no leader present
  const toRecord: { crewId: number; override: boolean }[] = [];
  if (isLeader && started) {
    if (myCrew !== null && targets.includes(myCrew)) toRecord.push({ crewId: myCrew, override: false });
    if (myRecord?.status === "PRESENT") {
      for (const c of targets) {
        if (c !== myCrew && !leaderPresent.has(c)) toRecord.push({ crewId: c, override: true });
      }
    }
  }

  async function rosterFor(crewId: number): Promise<RosterMember[]> {
    const members = await db.user.findMany({
      where: { crewId, status: "ACTIVE", isDeveloper: false },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, username: true },
    });
    const recs = await db.attendanceRecord.findMany({
      where: { fieldOpId: id, userId: { in: members.map((m) => m.id) } },
      select: { userId: true, status: true },
    });
    const map = new Map(recs.map((r) => [r.userId, r.status]));
    return members.map((m) => {
      const status: RosterMember["status"] = map.get(m.id) === "PRESENT" ? "PRESENT" : "ABSENT";
      return { ...m, status };
    });
  }
  const rosters = await Promise.all(toRecord.map(async (t) => ({ ...t, members: await rosterFor(t.crewId) })));

  // DO Operations summary
  const summary = canManage
    ? await db.attendanceRecord.groupBy({
        by: ["crewId", "status"],
        where: { fieldOpId: id },
        _count: { _all: true },
      })
    : null;
  const totals = canManage
    ? await db.user.groupBy({
        by: ["crewId"],
        where: { status: "ACTIVE", isDeveloper: false, crewId: { in: targets } },
        _count: { _all: true },
      })
    : null;
  const count = (crew: number, s: string) =>
    summary?.find((r) => r.crewId === crew && r.status === s)?._count._all ?? 0;
  const total = (crew: number) => totals?.find((t) => t.crewId === crew)?._count._all ?? 0;

  const showMine = myCrew !== null && targets.includes(myCrew);

  return (
    <div className="space-y-4">
      <Link href="/dashboard/fieldops" className="text-sm text-white/50 hover:text-white">
        ← All operations
      </Link>

      <section className="vignette-dark rounded-3xl border border-white/10 p-7 md:p-10">
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${phaseTone[phase]}`}>
          {phaseWord[phase]}
        </span>
        <h1 className="mt-4 text-3xl font-light tracking-tight md:text-4xl">{op.title}</h1>
        <p className="mt-3 text-white/70">
          {fmt(op.startsAt)}
          {op.endsAt ? ` to ${fmt(op.endsAt)}` : ""}
        </p>
        {op.location && <p className="mt-1 text-sm text-white/50">{op.location}</p>}
        {op.description && <p className="font-copy mt-5 text-sm leading-relaxed text-white/70">{op.description}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <CrewTargets allCrews={op.allCrews} crewIds={targets} />
        </div>
      </section>

      {showMine && (
        <section className={card}>
          <h2 className={h2}>Your attendance</h2>
          <p className="mt-4">
            {myRecord?.status === "PRESENT" ? (
              <span className="rounded-full border border-ok/50 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-ok">
                Present · +15 points
              </span>
            ) : myRecord?.status === "ABSENT" ? (
              <span className="rounded-full border border-bad/50 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-bad">
                Marked absent
              </span>
            ) : (
              <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                Not recorded yet
              </span>
            )}
          </p>
        </section>
      )}

      {isLeader && !started && (
        <section className={card}>
          <h2 className={h2}>Record attendance</h2>
          <p className="mt-3 text-sm text-warn">Attendance opens when the operation starts ({fmt(op.startsAt)}).</p>
        </section>
      )}

      {rosters.map((r) => (
        <section key={r.crewId} className={card}>
          <h2 className={`${h2} flex items-center gap-3`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: crewColor(r.crewId) }} />
            {r.override ? `Record for ${crewName(r.crewId)}` : `Record attendance · ${crewName(r.crewId)}`}
          </h2>
          <p className="mb-5 mt-1 text-sm text-white/50">
            {r.override
              ? "No leader of this crew is marked present, so you can record for them. Their leader can overwrite this later."
              : "Mark who attended. Present members earn 15 points."}
          </p>
          <FieldOpRoster
            key={`${r.crewId}-${r.members.map((m) => m.status[0]).join("")}`}
            fieldOpId={id}
            crewId={r.crewId}
            members={r.members}
          />
        </section>
      ))}

      {summary && (
        <section className={card}>
          <h2 className={h2}>Attendance by crew</h2>
          <div className="mt-5 space-y-3">
            {targets.map((c) => {
              const present = count(c, "PRESENT");
              const absent = count(c, "ABSENT");
              return (
                <div
                  key={c}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(c) }} />
                    {crewName(c)}
                  </span>
                  <span className="text-white/60">
                    {present + absent === 0 ? (
                      <span className="text-warn">Not recorded yet</span>
                    ) : (
                      <>
                        <span className="text-ok">{present}</span> present ·{" "}
                        <span className="text-bad">{absent}</span> absent
                      </>
                    )}
                    <span className="text-white/30"> · {total(c)} members</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
