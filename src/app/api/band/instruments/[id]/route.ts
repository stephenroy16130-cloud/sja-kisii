import { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { canManageInventory } from "@/lib/band";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  type: z.string().trim().min(2).max(60).optional(),
  serialNumber: z.string().trim().max(60).optional(),
  condition: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  restore: z.boolean().optional(),
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  if (!canManageInventory(actor)) throw new HttpError(403, "You do not have permission to do this");
  const { id } = await ctx.params;
  const d = schema.parse(await req.json());

  const inst = await db.bandInstrument.findUnique({ where: { id } });
  if (!inst) throw new HttpError(404, "Instrument not found");
  if (d.restore && inst.status !== "DAMAGED" && inst.status !== "LOST") {
    throw new HttpError(409, "Only damaged or lost instruments can be marked available again");
  }

  try {
    const updated = await db.bandInstrument.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.serialNumber !== undefined ? { serialNumber: d.serialNumber || null } : {}),
        ...(d.condition !== undefined ? { condition: d.condition || null } : {}),
        ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
        ...(d.restore ? { status: "AVAILABLE" as const } : {}),
      },
      select: { id: true, status: true },
    });
    await audit(actor.id, d.restore ? "INSTRUMENT_RESTORED" : "INSTRUMENT_EDITED", "BandInstrument", id, {
      name: inst.name,
    });
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "An instrument with that serial number already exists");
    }
    throw e;
  }
});
