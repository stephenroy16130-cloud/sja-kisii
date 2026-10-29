import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt, hasStarted, isApologyLocked, lockTime } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import ApologyActions from "./apology-actions";
import ApologyForm from "./apology-form";
import AttendanceRoster, { type RosterMember } from "./attendance-roster";

export const dynamic = "force-dynamic";

const card = "rounded-3xl border border-white/10 bg-card p-6";
const h2 = "text-xl font-light";
const tone = {
  PENDING: "border-warn/50 text-warn",
  APPROVED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
} as const;
const word = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Declined" } as const;

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id } });
  if (!meeting) notFound();

  const now = new Date();
  const locked = isApologyLocked(meeting.startsAt, now);
  const started = hasStarted(meeting.startsAt, now);
  const isAdmin = can(user, "meeting:manage");
  if (meeting.archivedAt && !isAdmin) notFound();
  const crewId = user.crewId;
  const isLeader = can(user, "crew:record_attendance") && crewId !== null;

  const myApology = await db.apology.findUnique({
    where: { meetingId_userId: { meetingId: id, userId: user.id } },
    select: { status: true, reason: true },
  });

  const apologies = isAdmin
    ? await db.apology.findMany({
        where: { meetingId: id },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { fullName: true, username: true, crewId: true } } },
      })
    : null;

  const summaryRows = isAdmin
    ? await db.attendanceRecord.groupBy({
        by: ["crewId", "status"],
        where: { meetingId: id },
        _count: { _all: true },
      })
    : null;
  const count = (crew: number, s: string) =>
    summaryRows?.find((r) => r.crewId === crew && r.status === s)?._count._all ?? 0;

  let roster: RosterMember[] = [];
  if (isLeader && crewId !== null) {
    const members = await db.user.findMany({
      where: { crewId, status: "ACTIVE", isDeveloper: false },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, username: true },
    });
    const ids = members.map((m) => m.id);
    const [records, excusedRows] = await Promise.all([
      db.attendanceRecord.findMany({ where: { meetingId: id, userId: { in: ids } }, select: { userId: true, status: true } }),
      db.apology.findMany({ where: { meetingId: id, status: "APPROVED", userId: { in: ids } }, select: { userId: true } }),
    ]);
    const rec = new Map(records.map((r) => [r.userId, r.status]));
    const exc = new Set(excusedRows.map((e) => e.userId));
    roster = members.map((m) => {
      const status: RosterMember["status"] = exc.has(m.id)
        ? "EXCUSED"
        : rec.get(m.id) === "PRESENT"
          ? "PRESENT"
          : "ABSENT";
      return { ...m, status };
    });
  }

  return (
    <div className="space-y-4">
      <Link href="/dashboard/meetings" className="text-sm text-white/50 hover:text-white">
        ← All meetings
      </Link>

      <section className="vignette-dark rounded-3xl border border-white/10 p-7 md:p-10">
        <h1 className="text-3xl font-light tracking-tight md:text-4xl">{meeting.title}</h1>
        <p className="mt-3 text-white/70">{fmt(meeting.startsAt)}</p>
        {meeting.location && <p className="mt-1 text-sm text-white/50">{meeting.location}</p>}
        {meeting.description && <p className="font-copy mt-5 text-sm leading-relaxed text-white/70">{meeting.description}</p>}
      </section>

      <section className={card}>
        <h2 className={h2}>Your apology</h2>
        <p className="mb-5 mt-1 text-sm text-white/50">
          {locked ? "Apologies closed" : "Apologies close"} {fmt(lockTime(meeting.startsAt))}.
        </p>
        <ApologyForm meetingId={id} locked={locked} existing={myApology} />
      </section>

      {isLeader && (
        <section className={card}>
          <h2 className={h2}>Record attendance{crewId !== null ? ` · ${crewName(crewId)}` : ""}</h2>
          <p className="mb-5 mt-1 text-sm text-white/50">
            Members with an approved apology are marked Excused automatically.
          </p>
          <AttendanceRoster meetingId={id} members={roster} open={started} opensAt={fmt(meeting.startsAt)} />
        </section>
      )}

      {apologies && (
        <section className={card}>
          <h2 className={h2}>Apologies ({apologies.length})</h2>
          {apologies.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">No apologies yet.</p>
          ) : (
            <div className="mt-5 divide-y divide-white/10">
              {apologies.map((a) => (
                <div key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {a.user.fullName} <span className="font-normal text-white/40">· {crewName(a.user.crewId)}</span>
                    </p>
                    <p className="mt-1 text-sm text-white/60">&ldquo;{a.reason}&rdquo;</p>
                    <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${tone[a.status]}`}>
                      {word[a.status]}
                    </span>
                  </div>
                  {a.status === "PENDING" && <ApologyActions id={a.id} />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {summaryRows && (
        <section className={card}>
          <h2 className={h2}>Attendance by crew</h2>
          <div className="mt-5 space-y-3">
            {[1, 2, 3, 4].map((c) => (
              <div key={c} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-sm last:border-0 last:pb-0">
                <span>{crewName(c)}</span>
                <span className="text-white/60">
                  <span className="text-ok">{count(c, "PRESENT")}</span> present ·{" "}
                  <span className="text-bad">{count(c, "ABSENT")}</span> absent ·{" "}
                  <span className="text-warn">{count(c, "EXCUSED")}</span> excused
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
