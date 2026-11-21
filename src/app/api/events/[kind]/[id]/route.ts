import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EVENT_PATH, eventAudiences, trainingLockReason } from "@/lib/event-edit";
import { HttpError, route } from "@/lib/http";
import { fmt } from "@/lib/meetings";
import { notifyAudience, notifyLeaders } from "@/lib/push";
import { canManageQr, EVENT_TYPE, loadEvent, QR_KINDS, type QrKind } from "@/lib/qr";
import { hasField } from "@/lib/schema-info";

const MODEL = { meeting: "Meeting", fieldop: "FieldOp", training: "Training" } as const;

const body = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(200).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  allCrews: z.boolean().optional(),
  crewIds: z.array(z.number().int().min(1).max(4)).max(4).optional(),
  leadersOnly: z.boolean().optional(),
});

async function authorise(kind: QrKind, id: string) {
  const actor = await requireUser();
  const e = await loadEvent(kind, { id });
  if (!e) throw new HttpError(404, "Event not found");
  if (!canManageQr(actor, e)) throw new HttpError(403, "You do not have permission to change this");
  if (kind === "training") {
    const locked = await trainingLockReason(actor, id);
    if (locked) throw new HttpError(409, locked);
  }
  return { actor, e };
}

export const PUT = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const { actor, e } = await authorise(kind, p.id);
  const d = body.parse(await req.json());

  const start = new Date(d.startsAt);
  if (kind === "fieldop" && d.endsAt && new Date(d.endsAt) <= start) throw new HttpError(400, "The end must be after the start");

  const model = MODEL[kind];
  const data: Record<string, unknown> = { title: d.title };
  data[kind === "training" ? "heldAt" : "startsAt"] = start;
  if (d.description !== undefined && hasField(model, "description")) data.description = d.description;
  if (d.location !== undefined && hasField(model, "location")) data.location = d.location;
  if (kind === "meeting" && d.leadersOnly !== undefined && hasField("Meeting", "leadersOnly")) data.leadersOnly = d.leadersOnly;

  let crewIds = e.crewIds;
  if (kind === "fieldop") {
    if (d.endsAt !== undefined && hasField("FieldOp", "endsAt")) data.endsAt = d.endsAt ? new Date(d.endsAt) : null;
    if (d.allCrews !== undefined) {
      const ids = [...new Set(d.crewIds ?? [])];
      if (!d.allCrews && ids.length === 0) throw new HttpError(400, "Choose at least one crew");
      data.allCrews = d.allCrews;
      data.crews = { set: d.allCrews ? [] : ids.map((id) => ({ id })) };
      crewIds = d.allCrews ? null : ids;
    }
  }

  if (kind === "meeting") await db.meeting.update({ where: { id: e.id }, data: data as Prisma.MeetingUpdateInput });
  else if (kind === "fieldop") await db.fieldOp.update({ where: { id: e.id }, data: data as Prisma.FieldOpUpdateInput });
  else await db.training.update({ where: { id: e.id }, data: data as Prisma.TrainingUpdateInput });

  await audit(actor.id, "EVENT_EDITED", kind, e.id, { title: d.title });

  const upcoming = start > new Date();
  const nowLeaders = kind === "meeting" ? (d.leadersOnly ?? e.leadersOnly) : false;
  const changed = d.title !== e.title || start.getTime() !== e.startsAt.getTime();

  if (upcoming) {
    if (kind === "meeting" && e.leadersOnly && d.leadersOnly === false) {
      // It was for leaders only and is now for everyone, so members are hearing about it for the first time
      after(() =>
        notifyAudience("GENERAL", null, { title: "New meeting: " + d.title, body: fmt(start), url: EVENT_PATH.meeting + e.id, tag: "event-" + e.id }, actor.id)
      );
    } else if (changed) {
      const aud = eventAudiences({ bandOnly: e.bandOnly, crewIds });
      const payload = { title: "Updated: " + d.title, body: fmt(start), url: EVENT_PATH[kind] + e.id, tag: "event-" + e.id };
      after(async () => {
        if (nowLeaders) {
          await notifyLeaders(payload, actor.id);
          return;
        }
        for (const a of aud) await notifyAudience(a.audience, a.crewId, payload, actor.id);
      });
    }
  }
  return Response.json({ id: e.id });
});

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const { actor, e } = await authorise(kind, p.id);

  const key = kind === "meeting" ? { meetingId: e.id } : kind === "fieldop" ? { fieldOpId: e.id } : { trainingId: e.id };
  const recorded = await db.attendanceRecord.count({ where: key });
  const type = EVENT_TYPE[kind];

  let result: "deleted" | "archived" = "archived";
  if (recorded === 0) {
    try {
      await db.$transaction([
        db.eventLink.deleteMany({ where: { kind: type, eventId: e.id } }),
        db.checkIn.deleteMany({ where: { kind: type, eventId: e.id } }),
        kind === "meeting"
          ? db.meeting.delete({ where: { id: e.id } })
          : kind === "fieldop"
            ? db.fieldOp.delete({ where: { id: e.id } })
            : db.training.delete({ where: { id: e.id } }),
      ]);
      result = "deleted";
    } catch (err) {
      // Something else still points at it, so hide it instead
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003")) throw err;
    }
  }

  if (result === "archived") {
    const now = new Date();
    if (kind === "meeting") await db.meeting.update({ where: { id: e.id }, data: { archivedAt: now } });
    else if (kind === "fieldop") await db.fieldOp.update({ where: { id: e.id }, data: { archivedAt: now, archivedById: actor.id } });
    else await db.training.update({ where: { id: e.id }, data: { archivedAt: now, archivedById: actor.id } });
  }

  await audit(actor.id, result === "deleted" ? "EVENT_DELETED" : "EVENT_ARCHIVED", kind, e.id, { title: e.title });

  if (e.startsAt > new Date()) {
    const payload = { title: "Cancelled: " + e.title, body: "This was removed by the organiser.", url: "/dashboard", tag: "event-" + e.id };
    const aud = eventAudiences(e);
    after(async () => {
      if (e.leadersOnly) {
        await notifyLeaders(payload, actor.id);
        return;
      }
      for (const a of aud) await notifyAudience(a.audience, a.crewId, payload, actor.id);
    });
  }
  return Response.json({ result });
});
