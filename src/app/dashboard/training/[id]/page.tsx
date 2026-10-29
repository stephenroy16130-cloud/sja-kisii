import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CrewTargets from "@/components/crew-targets";
import { getCurrentUser } from "@/lib/auth";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt, hasStarted } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { statusTone, statusWord, typeLabel } from "@/lib/training";
import VerifyButtons from "../verify-buttons";
import TrainingRoster, { type RosterMember } from "./training-roster";

export const dynamic = "force-dynamic";

const card = "rounded-3xl border border-white/10 bg-card p-6";
const h2 = "text-xl font-light";
const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const t = await db.training.findUnique({
    where: { id },
    include: { createdBy: { select: { fullName: true } }, verifiedBy: { select: { fullName: true } } },
  });
  if (!t) notFound();

  const verifier = can(user, "training:verify");
  const isCreator = t.createdById === user.id;
  const inAudience = t.crewId === null ? user.crewId !== null : t.crewId === user.crewId;
  if (!verifier && !isCreator && !(t.status === "VERIFIED" && inAudience)) notFound();

  const started = hasStarted(t.heldAt);
  const canRecord = (isCreator || verifier) && t.status !== "REJECTED" && (t.status !== "VERIFIED" || verifier);

  const myRecord = await db.attendanceRecord.findUnique({
    where: { userId_trainingId: { userId: user.id, trainingId: id } },
    select: { status: true },
  });

  let roster: RosterMember[] = [];
  if (canRecord && started) {
    const members = await db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false, crewId: t.crewId ?? { not: null } },
      orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, username: true, crewId: true },
    });
    const recs = await db.attendanceRecord.findMany({
      where: { trainingId: id, userId: { in: members.map((m) => m.id) } },
      select: { userId: true, status: true },
    });
    const map = new Map(recs.map((r) => [r.userId, r.status]));
    roster = members.map((m) => {
      const status: RosterMember["status"] = map.get(m.id) === "PRESENT" ? "PRESENT" : "ABSENT";
      return { ...m, status };
    });
  }

  const summary =
    isCreator || verifier
      ? await db.attendanceRecord.groupBy({
          by: ["crewId", "status"],
          where: { trainingId: id },
          _count: { _all: true },
        })
      : null;
  const crewsInSummary = [1, 2, 3, 4].filter((c) => t.crewId === null || t.crewId === c);
  const count = (crew: number, s: string) =>
    summary?.find((r) => r.crewId === crew && r.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/training" className="text-sm text-white/50 hover:text-white">
        ← All training
      </Link>

      <section className="vignette-dark rounded-3xl border border-white/10 p-7 md:p-10">
        <div className="flex flex-wrap gap-2">
          <span className={`${chip} border-white/30 text-white/80`}>{typeLabel[t.type]}</span>
          <span className={`${chip} ${statusTone[t.status]}`}>{statusWord[t.status]}</span>
        </div>
        <h1 className="mt-4 text-3xl font-light tracking-tight md:text-4xl">{t.title}</h1>
        <p className="mt-3 text-white/70">{fmt(t.heldAt)}</p>
        <p className="mt-1 text-sm text-white/50">Recorded by {t.createdBy.fullName}</p>
        {t.verifiedBy && t.status !== "PENDING" && (
          <p className="mt-1 text-sm text-white/50">
            {t.status === "VERIFIED" ? "Verified" : "Rejected"} by {t.verifiedBy.fullName}
          </p>
        )}
        {t.description && <p className="font-copy mt-5 text-sm leading-relaxed text-white/70">{t.description}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <CrewTargets allCrews={t.crewId === null} crewIds={t.crewId ? [t.crewId] : []} />
        </div>
      </section>

      {verifier && t.status === "PENDING" && (
        <section className={card}>
          <h2 className={h2}>Verification</h2>
          <p className="mb-5 mt-1 text-sm text-white/50">
            Verifying makes this session and its attendance count towards points and analytics.
          </p>
          <VerifyButtons id={t.id} />
        </section>
      )}

      {inAudience && (
        <section className={card}>
          <h2 className={h2}>Your attendance</h2>
          <p className="mt-4">
            {myRecord?.status === "PRESENT" ? (
              t.status === "VERIFIED" ? (
                <span className={`${chip} border-ok/50 text-ok`}>Present · +10 points</span>
              ) : (
                <span className={`${chip} border-warn/50 text-warn`}>Present · counts once verified</span>
              )
            ) : myRecord?.status === "ABSENT" ? (
              <span className={`${chip} border-bad/50 text-bad`}>Marked absent</span>
            ) : (
              <span className={`${chip} border-white/20 text-white/50`}>Not recorded yet</span>
            )}
          </p>
        </section>
      )}

      {canRecord && (
        <section className={card}>
          <h2 className={h2}>Record attendance</h2>
          {!started ? (
            <p className="mt-3 text-sm text-warn">Attendance opens when the session starts ({fmt(t.heldAt)}).</p>
          ) : (
            <>
              <p className="mb-5 mt-1 text-sm text-white/50">
                {t.status === "VERIFIED"
                  ? "This record is verified. Only DO Training can change it."
                  : "You can edit this until DO Training verifies the record."}
              </p>
              <TrainingRoster
                key={roster.map((m) => m.status[0]).join("")}
                trainingId={id}
                members={roster}
              />
            </>
          )}
        </section>
      )}

      {summary && (
        <section className={card}>
          <h2 className={h2}>Attendance summary</h2>
          <div className="mt-5 space-y-3">
            {crewsInSummary.map((c) => {
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
