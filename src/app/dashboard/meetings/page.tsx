import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt, isApologyLocked } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import ArchiveButton from "./archive-button";
import CreateMeetingForm from "./create-meeting-form";

export const dynamic = "force-dynamic";

async function load(userId: string, archived: boolean) {
  return db.meeting.findMany({
    where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
    orderBy: { startsAt: "desc" },
    take: archived ? 50 : 100,
    include: {
      apologies: { where: { userId }, select: { status: true } },
      _count: { select: { apologies: { where: { status: "PENDING" } } } },
    },
  });
}
type MeetingRow = Awaited<ReturnType<typeof load>>[number];

const word = { PENDING: "Apology pending", APPROVED: "Apology approved", REJECTED: "Apology declined" } as const;
const tone = {
  PENDING: "border-warn/50 text-warn",
  APPROVED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
} as const;
const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

function Row({
  m,
  now,
  isAdmin,
  upcoming,
  archived = false,
}: {
  m: MeetingRow;
  now: Date;
  isAdmin: boolean;
  upcoming: boolean;
  archived?: boolean;
}) {
  const mine = m.apologies[0]?.status;
  const closed = isApologyLocked(m.startsAt, now);
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-card p-5 transition hover:border-white/30 ${
        archived ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/dashboard/meetings/${m.id}`} className="min-w-0 flex-1">
          <p className="text-lg font-light">{m.title}</p>
          <p className="mt-1 text-sm text-white/60">
            {fmt(m.startsAt)}
            {m.location ? ` · ${m.location}` : ""}
          </p>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!archived && isAdmin && m._count.apologies > 0 && (
            <span className={`${chip} border-warn/50 text-warn`}>{m._count.apologies} pending</span>
          )}
          {!archived &&
            (mine ? (
              <span className={`${chip} ${tone[mine]}`}>{word[mine]}</span>
            ) : upcoming ? (
              <span className={`${chip} ${closed ? "border-white/20 text-white/50" : "border-gold/50 text-gold"}`}>
                {closed ? "Apologies closed" : "Apologies open"}
              </span>
            ) : null)}
          {isAdmin && archived && <ArchiveButton meetingId={m.id} title={m.title} archived />}
          {isAdmin && !archived && !upcoming && <ArchiveButton meetingId={m.id} title={m.title} archived={false} />}
        </div>
      </div>
    </div>
  );
}

export default async function MeetingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = can(user, "meeting:manage");
  const [meetings, archivedMeetings] = await Promise.all([
    load(user.id, false),
    isAdmin ? load(user.id, true) : Promise.resolve([] as MeetingRow[]),
  ]);
  const now = new Date();
  const upcoming = meetings.filter((m) => m.startsAt >= now).reverse();
  const past = meetings.filter((m) => m.startsAt < now);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Meetings</h1>
        <p className="mt-1 text-sm text-white/50">General meetings, apologies and attendance.</p>
      </div>

      {isAdmin && (
        <section>
          <h2 className="mb-4 text-xl font-light">Create a meeting</h2>
          <CreateMeetingForm />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-light">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            No upcoming meetings.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <Row key={m.id} m={m} now={now} isAdmin={isAdmin} upcoming />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Past</h2>
          <div className="space-y-3">
            {past.map((m) => (
              <Row key={m.id} m={m} now={now} isAdmin={isAdmin} upcoming={false} />
            ))}
          </div>
        </section>
      )}

      {isAdmin && archivedMeetings.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xl font-light text-white/60 hover:text-white">
            Archived ({archivedMeetings.length})
          </summary>
          <div className="mt-4 space-y-3">
            {archivedMeetings.map((m) => (
              <Row key={m.id} m={m} now={now} isAdmin={isAdmin} upcoming={false} archived />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
