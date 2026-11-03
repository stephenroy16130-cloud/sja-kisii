import type { Prisma } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyUsers } from "@/lib/push";
import { canVerifyFor, canViewQr, EVENT_TYPE, loadEvent, QR_KINDS, type QrKind } from "@/lib/qr";

const schema = z
  .object({
    decisions: z
      .array(z.object({ userId: z.string().min(1), decision: z.enum(["confirm", "reject"]) }))
      .max(300)
      .optional(),
    all: z.enum(["confirm", "reject"]).optional(),
  })
  .refine((d) => d.all || (d.decisions && d.decisions.length > 0), { message: "Nothing to verify" });

// Confirming turns the scan into a real Present record
function presentRecord(kind: QrKind, eventId: string, userId: string, crewId: number | null, actorId: string) {
  const update = { status: "PRESENT" as const, recordedById: actorId, recordedAt: new Date() };
  const base = { userId, crewId, status: "PRESENT" as const, recordedById: actorId };
  if (kind === "meeting") {
    return db.attendanceRecord.upsert({
      where: { userId_meetingId: { userId, meetingId: eventId } },
      update,
      create: { ...base, eventType: "MEETING", meetingId: eventId },
    });
  }
  if (kind === "fieldop") {
    return db.attendanceRecord.upsert({
      where: { userId_fieldOpId: { userId, fieldOpId: eventId } },
      update,
      create: { ...base, eventType: "FIELD_OP", fieldOpId: eventId },
    });
  }
  return db.attendanceRecord.upsert({
    where: { userId_trainingId: { userId, trainingId: eventId } },
    update,
    create: { ...base, eventType: "TRAINING", trainingId: eventId },
  });
}

export const POST = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const d = schema.parse(await req.json());

  const e = await loadEvent(kind, { id: p.id });
  if (!e || !canViewQr(actor, e)) throw new HttpError(404, "Event not found");

  const wanted = new Map((d.decisions ?? []).map((x) => [x.userId, x.decision]));
  const pending = await db.checkIn.findMany({
    where: {
      kind: EVENT_TYPE[kind],
      eventId: e.id,
      status: "PENDING",
      ...(d.all ? {} : { userId: { in: [...wanted.keys()] } }),
    },
  });

  const todo = pending.flatMap((r) => {
    const decision = d.all ?? wanted.get(r.userId);
    return decision && canVerifyFor(actor, e, r.crewId) ? [{ r, decision }] : [];
  });
  if (todo.length === 0) throw new HttpError(409, "There is nothing to verify. It may already be done.");

  const now = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const { r, decision } of todo) {
    ops.push(
      db.checkIn.updateMany({
        where: { id: r.id, status: "PENDING" },
        data: { status: decision === "confirm" ? "CONFIRMED" : "REJECTED", decidedById: actor.id, decidedAt: now },
      })
    );
    if (decision === "confirm") ops.push(presentRecord(kind, e.id, r.userId, r.crewId, actor.id));
  }
  await db.$transaction(ops);

  const yes = todo.filter((t) => t.decision === "confirm").map((t) => t.r.userId);
  const no = todo.filter((t) => t.decision === "reject").map((t) => t.r.userId);
  await audit(actor.id, "CHECKIN_VERIFIED", "CheckIn", e.id, { kind, confirmed: yes.length, rejected: no.length });
  after(async () => {
    await notifyUsers(yes, { title: "Check-in confirmed", body: e.title, url: "/dashboard/attendance", tag: "checkin" });
    await notifyUsers(no, { title: "Check-in not accepted", body: e.title, url: "/dashboard/scan", tag: "checkin" });
  });
  return Response.json({ confirmed: yes.length, rejected: no.length });
});
