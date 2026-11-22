import type { Prisma } from "@prisma/client";
import { personalInsights } from "./attendance-insights";
import { inBand } from "./band";
import { crewName } from "./crews";
import { db } from "./db";
import { fmt } from "./meetings";
import type { AuthUser } from "./rbac";
import { hasField } from "./schema-info";
import { servicePoints } from "./service-points";

export type CtxUser = AuthUser & { fullName: string };

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const kes = (n: unknown) => "KES " + Number(String(n)).toLocaleString("en-KE");

// Only the member's own facts. No phone, ID, admission number, email, or anything about other people.
export async function buildUserContext(u: CtxUser): Promise<string> {
  const now = new Date();
  const first = cap((u.fullName.trim().split(/\s+/)[0] ?? "").toLowerCase());
  const roles = [
    ...(u.isSuperintendent ? ["Divisional Superintendent"] : []),
    ...u.titles.map((t) => cap(t.replace(/_/g, " ").toLowerCase())),
  ];
  const leader = u.isSuperintendent || u.titles.some((t) => t !== "BAND_MEMBER");

  const lines: string[] = [
    "FACTS ABOUT THE MEMBER WHO IS ASKING (use them for this member only)",
    `Now: ${now.toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi" })} (Nairobi time)`,
    `First name: ${first || "Member"}`,
    `Crew: ${u.crewId ? crewName(u.crewId) : "not placed in a crew yet"}`,
    `Roles: ${roles.length ? roles.join(", ") : "Member"}`,
  ];

  try {
    const p = await servicePoints(u.id);
    lines.push(
      `Points in service (all time): ${p.total} (meetings ${p.meetings}, field operations ${p.fieldOps}, training ${p.training}, band ${p.band})`
    );
  } catch {
    // leave it out
  }

  try {
    const a = await personalInsights(u.id);
    lines.push(
      a.total > 0
        ? `Attendance: attended ${a.present} of ${a.total} recorded events, current streak ${a.streak}, ${a.excused} excused`
        : "Attendance: nothing recorded yet"
    );
  } catch {
    // leave it out
  }

  try {
    const mWhere: Prisma.MeetingWhereInput = { startsAt: { gt: now }, archivedAt: null };
    if (!leader && hasField("Meeting", "leadersOnly")) (mWhere as Record<string, unknown>).leadersOnly = false;
    const crewId = u.crewId;
    const [meetings, ops, trainings] = await Promise.all([
      db.meeting.findMany({ where: mWhere, orderBy: { startsAt: "asc" }, take: 3, select: { title: true, startsAt: true } }),
      crewId
        ? db.fieldOp.findMany({
            where: { startsAt: { gt: now }, archivedAt: null, OR: [{ allCrews: true }, { crews: { some: { id: crewId } } }] },
            orderBy: { startsAt: "asc" },
            take: 3,
            select: { title: true, startsAt: true },
          })
        : Promise.resolve([] as { title: string; startsAt: Date }[]),
      crewId
        ? db.training.findMany({
            where: {
              heldAt: { gt: now },
              archivedAt: null,
              status: "VERIFIED",
              ...(inBand(u) ? {} : { type: { not: "BAND" as const } }),
              OR: [{ crewId: null }, { crewId }],
            },
            orderBy: { heldAt: "asc" },
            take: 3,
            select: { title: true, heldAt: true },
          })
        : Promise.resolve([] as { title: string; heldAt: Date }[]),
    ]);
    const items = [
      ...meetings.map((m) => ({ kind: "Meeting", title: m.title, at: m.startsAt })),
      ...ops.map((m) => ({ kind: "Field operation", title: m.title, at: m.startsAt })),
      ...trainings.map((m) => ({ kind: "Training", title: m.title, at: m.heldAt })),
    ]
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, 5);
    lines.push(items.length ? "Coming up for this member:" : "Coming up: nothing scheduled that this member can see");
    items.forEach((i) => lines.push(`- ${i.kind}: ${i.title}, ${fmt(i.at)}`));
  } catch {
    // leave it out
  }

  try {
    const crewId = u.crewId;
    const open = await db.collection.findMany({
      where: {
        isOpen: true,
        archivedAt: null,
        AND: [
          { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
          { OR: [{ crewId: null }, ...(crewId ? [{ crewId }] : [])] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, amount: true },
    });
    if (open.length) {
      const paid = await db.transaction.findMany({
        where: { userId: u.id, collectionId: { in: open.map((o) => o.id) }, status: "SUCCESS" },
        select: { collectionId: true },
      });
      const done = new Set(paid.map((p) => p.collectionId));
      lines.push("Open for payment on the Pay page:");
      open.forEach((o) => lines.push(`- ${o.title}, ${kes(o.amount)} (${done.has(o.id) ? "already paid" : "not paid yet"})`));
    }
  } catch {
    // leave it out
  }

  try {
    const n = await db.order.count({ where: { userId: u.id, status: "PENDING_PAYMENT" } });
    if (n > 0) lines.push(`Shop orders waiting for payment: ${n}`);
  } catch {
    // leave it out
  }

  return lines.join("\n");
}
