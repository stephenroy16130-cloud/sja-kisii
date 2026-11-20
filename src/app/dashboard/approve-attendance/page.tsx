import type { EventType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckinReview from "@/components/checkin-review";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { titlesFor } from "@/lib/qr";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ROUTE: Record<EventType, "meeting" | "fieldop" | "training"> = {
  MEETING: "meeting",
  FIELD_OP: "fieldop",
  TRAINING: "training",
};
const PATH: Record<EventType, string> = {
  MEETING: "/dashboard/meetings/",
  FIELD_OP: "/dashboard/fieldops/",
  TRAINING: "/dashboard/training/",
};
const WORD: Record<EventType, string> = { MEETING: "Meeting", FIELD_OP: "Field operation", TRAINING: "Training" };

export default async function ApproveAttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Each DO approves their own area: meetings, field operations, training (and band practice)
  const kinds: EventType[] = [];
  if (can(user, "meeting:manage")) kinds.push("MEETING");
  if (can(user, "fieldop:manage")) kinds.push("FIELD_OP");
  if (can(user, "training:verify")) kinds.push("TRAINING");
  if (kinds.length === 0) redirect("/dashboard");

  const pending = await db.checkIn.findMany({
    where: { status: "PENDING", kind: { in: kinds } },
    orderBy: { scannedAt: "asc" },
    take: 600,
    include: { user: { select: { fullName: true } } },
  });
  const titles = await titlesFor(pending.map((p) => ({ kind: p.kind, eventId: p.eventId })));

  const groups = new Map<string, { kind: EventType; eventId: string; title: string; date: Date; rows: typeof pending }>();
  for (const p of pending) {
    const key = `${p.kind}:${p.eventId}`;
    const info = titles.get(key);
    if (!info) continue;
    const g = groups.get(key) ?? { kind: p.kind, eventId: p.eventId, title: info.title, date: info.date, rows: [] };
    g.rows.push(p);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  const total = list.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Approve attendance</h1>
        <p className="mt-1 text-sm text-white/50">
          Check-ins still waiting for your approval, including from events that have already passed. Approve only the
          people who were really there. Approving marks them present and tells them.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
          Nothing is waiting for approval. All caught up.
        </div>
      ) : (
        <>
          <p className="text-sm text-white/60">
            <span className="text-warn">{total}</span> waiting across {list.length} {list.length === 1 ? "event" : "events"}
          </p>
          <div className="space-y-6">
            {list.map((g) => (
              <section key={`${g.kind}:${g.eventId}`} className="rounded-3xl border border-white/10 bg-card p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{WORD[g.kind]}</p>
                <Link href={PATH[g.kind] + g.eventId} className="mt-1 block text-xl font-light hover:underline">
                  {g.title}
                </Link>
                <p className="mb-4 mt-1 text-xs text-white/40">
                  {fmt(g.date)} · {g.rows.length} waiting
                </p>
                <CheckinReview
                  kind={ROUTE[g.kind]}
                  eventId={g.eventId}
                  rows={g.rows.map((r) => ({
                    userId: r.userId,
                    name: r.user.fullName,
                    crew: crewName(r.crewId),
                    at: fmt(r.scannedAt),
                  }))}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
