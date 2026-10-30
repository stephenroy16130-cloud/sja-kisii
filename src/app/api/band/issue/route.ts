import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { BAND_TITLES } from "@/lib/band";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

const schema = z.object({
  instrumentId: z.string().min(1, "Choose an instrument"),
  userId: z.string().min(1, "Choose a band member"),
  notes: z.string().trim().max(300).optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("band:issue_instruments");
  const d = schema.parse(await req.json());

  const member = await db.user.findFirst({
    where: { id: d.userId, status: "ACTIVE", isDeveloper: false, titles: { hasSome: BAND_TITLES } },
    select: { id: true },
  });
  if (!member) throw new HttpError(400, "That person is not an active band member");

  const log = await db.$transaction(async (tx) => {
    // Atomic: two people can never be issued the same instrument
    const r = await tx.bandInstrument.updateMany({
      where: { id: d.instrumentId, status: "AVAILABLE" },
      data: { status: "ISSUED" },
    });
    if (r.count === 0) throw new HttpError(409, "This instrument is not available");
    return tx.instrumentIssuanceLog.create({
      data: { instrumentId: d.instrumentId, issuedToId: d.userId, issuedById: actor.id, notes: d.notes || null },
      select: { id: true },
    });
  }, TX_OPTS);

  await audit(actor.id, "INSTRUMENT_ISSUED", "InstrumentIssuanceLog", log.id, {
    instrumentId: d.instrumentId,
    userId: d.userId,
  });
  return Response.json(log, { status: 201 });
});
