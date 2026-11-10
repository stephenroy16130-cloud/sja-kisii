import type { AttendanceStatus, Prisma, RequestStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import ContextualTooltip from "@/components/contextual-tooltip";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { DISPUTE_DAYS, eventInfo, withinWindow } from "@/lib/disputes";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import DisputeButton from "./dispute-button";
import DisputeReview from "./dispute-review";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";
const statusTone: Record<AttendanceStatus, string> = {
  PRESENT: "border-ok/50 text-ok",
  ABSENT: "border-bad/50 text-bad",
  EXCUSED: "border-warn/50 text-warn",
};
const statusWord: Record<AttendanceStatus, string> = { PRESENT: "Present", ABSENT: "Absent", EXCUSED: "Excused" };
const disputeTone: Record<RequestStatus, string> = {
  PENDING: "border-warn/50 text-warn",
  APPROVED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
};
const disputeWord: Record<RequestStatus, string> = {
  PENDING: "Dispute pending",
  APPROVED: "Dispute approved",
  REJECTED: "Dispute declined",
};

const include = {
  meeting: { select: { title: true, startsAt: true } },
  fieldOp: { select: { title: true, startsAt: true } },
  training: { select: { title: true, heldAt: true, status: true } },
} satisfies Prisma.AttendanceRecordInclude;

async function loadReview(filters: Prisma.AttendanceRecordWhereInput[]) {
  if (filters.length === 0) return [];
  return db.attendanceRecord.findMany({
    where: { disputed: true, disputeStatus: "PENDING", OR: filters },
    orderBy: { recordedAt: "asc" },
    take: 100,
    include: { ...include, user: { select: { fullName: true, crewId: true } } },
  });
}

type Item = {
  id: string;
  status: AttendanceStatus;
  kind: string;
  title: string;
  date: Date;
  reason: string | null;
  dispute: RequestStatus | null;
};

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const filters: Prisma.AttendanceRecordWhereInput[] = [];
  if (can(user, "meeting:manage")) filters.push({ eventType: "MEETING" });
  if (can(user, "fieldop:manage")) filters.push({ eventType: "FIELD_OP" });
  if (can(user, "training:verify")) filters.push({ eventType: "TRAINING" });

  const [rows, review] = await Promise.all([
    db.attendanceRecord.findMany({ where: { userId: user.id }, orderBy: { recordedAt: "desc" }, take: 80, include }),
    loadReview(filters),
  ]);

  const items: Item[] = [];
  for (const r of rows) {
    if (r.eventType === "TRAINING" && r.training?.status !== "VERIFIED") continue;
    const info = eventInfo(r);
    if (!info) continue;
    items.push({
      id: r.id,
      status: r.status,
      kind: info.kind,
      title: info.title,
      date: info.date,
      reason: r.disputeReason,
      dispute: r.disputed ? r.disputeStatus : null,
    });
  }
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  const count = (s: AttendanceStatus) => items.filter((i) => i.status === s).length;
  const now = new Date();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-white/50">
          Your record at meetings, field operations and training. If you were marked absent by mistake, you can dispute
          it within {DISPUTE_DAYS} days.
        </p>
      </div>

      {filters.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Disputes waiting for you ({review.length})</h2>
          {review.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
              No disputes waiting.
            </div>
          ) : (
            <div className="space-y-3">
              {review.map((r) => {
                const info = eventInfo(r);
                return (
                  <div
                    key={r.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm uppercase tracking-wide">
                        {r.user.fullName} <span className="text-white/40">· {crewName(r.user.crewId)}</span>
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        {info ? `${info.kind}: ${info.title} · ${fmt(info.date)}` : "Event"}
                      </p>
                      <p className="mt-2 text-sm text-white/80">&ldquo;{r.disputeReason}&rdquo;</p>
                    </div>
                    <DisputeReview id={r.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <ContextualTooltip
        id="hasSeenAttendanceTooltip"
        title="Attendance Records & Disputes"
        position="bottom"
        align="start"
        content="Every meeting or field op attended earns points toward Member of the Week. If marked absent by mistake, tap 'Dispute' within 14 days."
      >
        <section className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-2xl font-light text-ok">{count("PRESENT")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Present</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-2xl font-light text-bad">{count("ABSENT")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Absent</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-2xl font-light text-warn">{count("EXCUSED")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Excused</p>
          </div>
        </section>
      </ContextualTooltip>

      <section>
        <h2 className="mb-4 text-xl font-light">My history</h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            Nothing recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((i) => {
              const canDispute = i.status === "ABSENT" && !i.dispute && withinWindow(i.date, now);
              return (
                <div key={i.id} className="rounded-2xl border border-white/10 bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-light">{i.title}</p>
                      <p className="mt-1 text-sm text-white/50">
                        {i.kind} · {fmt(i.date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`${chip} ${statusTone[i.status]}`}>{statusWord[i.status]}</span>
                      {i.dispute && <span className={`${chip} ${disputeTone[i.dispute]}`}>{disputeWord[i.dispute]}</span>}
                      {canDispute && <DisputeButton id={i.id} />}
                    </div>
                  </div>
                  {i.dispute && i.reason && <p className="mt-3 text-sm text-white/60">&ldquo;{i.reason}&rdquo;</p>}
                  {i.status === "ABSENT" && !i.dispute && !canDispute && (
                    <p className="mt-3 text-xs text-white/40">The {DISPUTE_DAYS}-day dispute window has closed.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
