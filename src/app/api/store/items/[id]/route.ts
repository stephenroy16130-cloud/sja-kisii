import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z
  .object({
    isActive: z.boolean().optional(),
    quantity: z.number().int().min(0).max(100000).optional(),
  })
  .refine((d) => d.isActive !== undefined || d.quantity !== undefined, { message: "Nothing to change" });

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const d = schema.parse(await req.json());

  const item = await db.item.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, "Item not found");
  if (d.quantity !== undefined && item.stockType !== "READY_STOCK") {
    throw new HttpError(400, "Only ready-stock items have a quantity");
  }

  const updated = await db.item.update({
    where: { id },
    data: { ...(d.isActive !== undefined ? { isActive: d.isActive } : {}), ...(d.quantity !== undefined ? { quantity: d.quantity } : {}) },
    select: { id: true, isActive: true, quantity: true },
  });
  await audit(actor.id, "STORE_ITEM_UPDATED", "Item", id, {
    name: item.name,
    isActive: updated.isActive,
    quantity: updated.quantity,
  });
  return Response.json(updated);
});
