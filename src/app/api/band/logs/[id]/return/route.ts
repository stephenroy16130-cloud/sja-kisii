import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

const schema = z.object({
  outcome: z.enum(["RETURNED", "DAMAGED", "LOST"]),
  condition: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("band:issue_instruments");
  const { id } = await ctx.params;
  const { outcome, condition, notes } = schema.parse(await req.json());

  const log = await db.instrumentIssuanceLog.findUnique({ where: { id } });
  if (!log) throw new HttpError(404, "Issue record not found");
  if (log.returnedAt || log.markedLost) throw new HttpError(409, "This instrument was already closed out");

  const noteText = notes ? (log.notes ? `${log.notes} | ${notes}` : notes) : undefined;
  const logData =
    outcome === "LOST"
      ? { markedLost: true, receivedById: actor.id, notes: noteText }
      : {
          returnedAt: new Date(),
          receivedById: actor.id,
          conditionOnReturn: condition || null,
          markedDamaged: outcome === "DAMAGED",
          notes: noteText,
        };
  const status = outcome === "RETURNED" ? "AVAILABLE" : outcome;

  await db.$transaction(async (tx) => {
    const r = await tx.instrumentIssuanceLog.updateMany({
      where: { id, returnedAt: null, markedLost: false },
      data: logData,
    });
    if (r.count === 0) throw new HttpError(409, "This record just changed. Refresh and try again.");
    await tx.bandInstrument.update({
      where: { id: log.instrumentId },
      data: { status, ...(condition ? { condition } : {}) },
    });
  }, TX_OPTS);

  await audit(actor.id, `INSTRUMENT_${outcome}`, "InstrumentIssuanceLog", id, { instrumentId: log.instrumentId });
  return Response.json({ id, outcome });
});
