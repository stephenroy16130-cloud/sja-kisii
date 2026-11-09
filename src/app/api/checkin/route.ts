import { inBand } from "@/lib/band";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { EVENT_TYPE, kindOfToken, loadEvent, windowState } from "@/lib/qr";

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const { token } = z.object({ token: z.string().trim().max(60) }).parse(await req.json());

  const kind = kindOfToken(token);
  if (!kind) throw new HttpError(404, "This QR code is not valid.");
  const e = await loadEvent(kind, { token });
  if (!e || e.qrToken !== token) throw new HttpError(404, "This QR code is no longer valid.");
  if (e.blocked) throw new HttpError(409, e.blocked);

  // Time-bound validation: the server clock decides
  const w = windowState(e);
  if (w === "NOT_SET" || w === "EARLY") throw new HttpError(409, "Check-in has not started yet.");
  if (w === "CLOSED") throw new HttpError(409, "Check-in has closed.");

  if (e.bandOnly && !inBand(actor)) throw new HttpError(403, "This check-in is for band members.");
  if (actor.crewId === null) throw new HttpError(403, "You are not assigned to a crew, so you cannot check in.");
  if (e.crewIds && !e.crewIds.includes(actor.crewId)) throw new HttpError(403, "This check-in is not for your crew.");

  const type = EVENT_TYPE[kind];
  const key = kind === "meeting" ? { meetingId: e.id } : kind === "fieldop" ? { fieldOpId: e.id } : { trainingId: e.id };
  const rec = await db.attendanceRecord.findFirst({ where: { userId: actor.id, ...key }, select: { status: true } });
  if (rec?.status === "PRESENT") {
    return Response.json({ status: "CONFIRMED", title: e.title, message: "You are already marked present." });
  }
  if (rec?.status === "EXCUSED") throw new HttpError(409, "You were excused from this, so there is nothing to check in to.");

  const where = { kind_eventId_userId: { kind: type, eventId: e.id, userId: actor.id } };
  const existing = await db.checkIn.findUnique({ where });
  if (existing) {
    if (existing.status === "REJECTED") {
      throw new HttpError(409, "Your check-in was not accepted. Please speak to your leader.");
    }
    return Response.json({
      status: existing.status,
      title: e.title,
      message: existing.status === "CONFIRMED" ? "You are checked in." : "You have already checked in. Waiting for verification.",
    });
  }

  try {
    await db.checkIn.create({ data: { kind: type, eventId: e.id, userId: actor.id, crewId: actor.crewId } });
  } catch (err) {
    // Two taps at once: the second one is simply the same check-in
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  return Response.json({ status: "PENDING", title: e.title }, { status: 201 });
});
