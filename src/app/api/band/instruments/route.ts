import { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { canManageInventory } from "@/lib/band";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  type: z.string().trim().min(2, "Enter the instrument type").max(60),
  serialNumber: z.string().trim().max(60).optional(),
  condition: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  if (!canManageInventory(actor)) throw new HttpError(403, "You do not have permission to do this");
  const d = schema.parse(await req.json());

  try {
    const inst = await db.bandInstrument.create({
      data: {
        name: d.name,
        type: d.type,
        serialNumber: d.serialNumber || null,
        condition: d.condition || null,
        notes: d.notes || null,
      },
      select: { id: true, name: true },
    });
    await audit(actor.id, "INSTRUMENT_ADDED", "BandInstrument", inst.id, { name: inst.name });
    return Response.json(inst, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "An instrument with that serial number already exists");
    }
    throw e;
  }
});
