import { inBand } from "@/lib/band";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { EVENT_TYPE, kindOfToken, loadEvent, QR_KINDS, windowState, type QrKind } from "@/lib/qr";

const FIRST_ACTION_REWARD_TOAST =
  "🎉 First Check-In Successful! You earned 10 points toward Member of the Week.";

// Kisii University central campus coordinates: -0.6773, 34.7796
const CAMPUS_LAT = -0.6773;
const CAMPUS_LNG = 34.7796;
const MAX_GEOFENCE_RADIUS_METERS = 3000; // 3km radius covering university & vicinity

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const checkInSchema = z.union([
  z.object({
    token: z.string().trim().max(60),
    coords: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
  }),
  z.object({
    method: z.literal("geofence"),
    kind: z.enum(QR_KINDS),
    eventId: z.string().trim().min(1),
    coords: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),
]);

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const body = checkInSchema.parse(await req.json());

  let kind: QrKind;
  let e;

  if ("method" in body && body.method === "geofence") {
    kind = body.kind;
    e = await loadEvent(kind, { id: body.eventId });
    if (!e) throw new HttpError(404, "This event was not found.");

    // Validate Geofence coordinates
    const dist = haversineDistanceMeters(
      body.coords.latitude,
      body.coords.longitude,
      CAMPUS_LAT,
      CAMPUS_LNG
    );
    if (dist > MAX_GEOFENCE_RADIUS_METERS) {
      throw new HttpError(
        403,
        `Geofence verification failed: You are ${Math.round(dist / 1000)}km away from the meeting location. Please ensure you are at the event venue.`
      );
    }
  } else if ("token" in body) {
    const k = kindOfToken(body.token);
    if (!k) throw new HttpError(404, "This QR code is not valid.");
    kind = k;
    e = await loadEvent(kind, { token: body.token });
    if (!e || e.qrToken !== body.token) throw new HttpError(404, "This QR code is no longer valid.");
  } else {
    throw new HttpError(400, "Invalid check-in payload.");
  }

  if (e.blocked) throw new HttpError(409, e.blocked);

  // Time-bound validation: the server clock decides
  const w = windowState(e);
  if (w === "NOT_SET" || w === "EARLY") throw new HttpError(409, "Check-in has not started yet.");
  if (w === "CLOSED") throw new HttpError(409, "Check-in has closed.");

  if (e.bandOnly && !inBand(actor)) throw new HttpError(403, "This check-in is for band members.");
  if (actor.crewId === null) throw new HttpError(403, "You are not assigned to a crew, so you cannot check in.");
  if (e.crewIds && !e.crewIds.includes(actor.crewId)) throw new HttpError(403, "This check-in is not for your crew.");

  // Check if this will be the user's very first Check-In in the system
  const priorCheckIns = await db.checkIn.count({
    where: { userId: actor.id },
  });
  const isFirstCheckIn = priorCheckIns === 0;

  const type = EVENT_TYPE[kind];
  const key = kind === "meeting" ? { meetingId: e.id } : kind === "fieldop" ? { fieldOpId: e.id } : { trainingId: e.id };
  const rec = await db.attendanceRecord.findFirst({ where: { userId: actor.id, ...key }, select: { status: true } });
  if (rec?.status === "PRESENT") {
    return Response.json({
      status: "CONFIRMED",
      title: e.title,
      message: "You are already marked present.",
      isFirstCheckIn,
      rewardToast: isFirstCheckIn ? FIRST_ACTION_REWARD_TOAST : null,
      toast: isFirstCheckIn ? FIRST_ACTION_REWARD_TOAST : undefined,
    });
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
      isFirstCheckIn,
      rewardToast: isFirstCheckIn ? FIRST_ACTION_REWARD_TOAST : null,
      toast: isFirstCheckIn ? FIRST_ACTION_REWARD_TOAST : undefined,
    });
  }

  try {
    await db.checkIn.create({ data: { kind: type, eventId: e.id, userId: actor.id, crewId: actor.crewId } });
  } catch (err) {
    // Two taps at once: the second one is simply the same check-in
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }

  return Response.json(
    {
      status: "PENDING",
      title: e.title,
      isFirstCheckIn,
      rewardToast: isFirstCheckIn ? FIRST_ACTION_REWARD_TOAST : null,
      toast: isFirstCheckIn ? FIRST_ACTION_REWARD_TOAST : undefined,
    },
    { status: 201 }
  );
});
