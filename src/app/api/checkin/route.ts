import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { inBand } from "@/lib/band";
import { db } from "@/lib/db";
import { distanceM, MAX_ACCURACY_SLACK } from "@/lib/geo";
import { HttpError, route } from "@/lib/http";
import { BAND_POINTS, FIELD_OP_POINTS, MEETING_POINTS, TRAINING_POINTS } from "@/lib/points";
import { EVENT_TYPE, kindOfToken, loadEvent, QR_KINDS, windowState, type QrEvent } from "@/lib/qr";

const body = z
  .object({
    token: z.string().trim().max(60).optional(),
    kind: z.enum(QR_KINDS).optional(),
    id: z.string().max(40).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    accuracy: z.number().min(0).max(100_000).optional(),
  })
  .refine((d) => d.token || (d.kind && d.id), { message: "Nothing to check in to" });

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const d = body.parse(await req.json());

  let e: QrEvent | null;
  if (d.token) {
    const k = kindOfToken(d.token);
    if (!k) throw new HttpError(404, "This QR code is not valid.");
    e = await loadEvent(k, { token: d.token });
    if (!e || e.qrToken !== d.token) throw new HttpError(404, "This QR code is no longer valid.");
  } else {
    // "Check in here" without scanning: only for events that have a location check
    e = await loadEvent(d.kind as NonNullable<typeof d.kind>, { id: d.id as string });
    if (!e || !e.qrToken) throw new HttpError(404, "Check-in is not available for this event.");
    if (!e.geo) throw new HttpError(403, "Scan the QR code at the venue to check in.");
  }
  if (e.blocked) throw new HttpError(409, e.blocked);

  // Time-bound validation: the server clock decides
  const w = windowState(e);
  if (w === "NOT_SET" || w === "EARLY") throw new HttpError(409, "Check-in has not started yet.");
  if (w === "CLOSED") throw new HttpError(409, "Check-in has closed.");

  if (e.bandOnly && !inBand(actor)) throw new HttpError(403, "This check-in is for band members.");
  if (actor.crewId === null) throw new HttpError(403, "You are not assigned to a crew, so you cannot check in.");
  if (e.crewIds && !e.crewIds.includes(actor.crewId)) throw new HttpError(403, "This check-in is not for your crew.");

  // Location check: you must be at the venue
  if (e.geo) {
    if (d.lat === undefined || d.lng === undefined) {
      throw new HttpError(400, "Your location is needed to check in here. Allow location access and try again.");
    }
    const dist = distanceM({ lat: d.lat, lng: d.lng }, e.geo);
    const slack = Math.min(d.accuracy ?? 0, MAX_ACCURACY_SLACK);
    if (dist > e.geo.radius + slack) {
      throw new HttpError(
        403,
        `You are about ${Math.round(dist)} m from the venue. Check-in works within ${e.geo.radius} m. Move closer and try again.`
      );
    }
  }

  const type = EVENT_TYPE[e.kind];
  const key = e.kind === "meeting" ? { meetingId: e.id } : e.kind === "fieldop" ? { fieldOpId: e.id } : { trainingId: e.id };
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

  // Is this the very first check-in this member has ever made?
  const prior = await db.checkIn.count({ where: { userId: actor.id } });
  const points = e.kind === "meeting" ? MEETING_POINTS : e.kind === "fieldop" ? FIELD_OP_POINTS : e.bandOnly ? BAND_POINTS : TRAINING_POINTS;

  let first = prior === 0;
  try {
    await db.checkIn.create({ data: { kind: type, eventId: e.id, userId: actor.id, crewId: actor.crewId } });
  } catch (err) {
    // Two taps at once: the second one is simply the same check-in
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    first = false;
  }
  return Response.json({ status: "PENDING", title: e.title, first, points, band: e.bandOnly }, { status: 201 });
});
