import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("training:verify");
  const { id } = await ctx.params;
  const { decision } = z.object({ decision: z.enum(["verify", "reject"]) }).parse(await req.json());

  const training = await db.training.findUnique({ where: { id } });
  if (!training) throw new HttpError(404, "Training record not found");
  if (training.status !== "PENDING") throw new HttpError(409, "This record was already reviewed");

  const updated = await db.training.update({
    where: { id },
    data: {
      status: decision === "verify" ? "VERIFIED" : "REJECTED",
      verifiedById: actor.id,
      verifiedAt: new Date(),
    },
    select: { id: true, status: true },
  });
  await audit(actor.id, `TRAINING_${updated.status}`, "Training", id, { title: training.title });
  return Response.json(updated);
});
