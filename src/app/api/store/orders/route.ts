import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { fmt } from "@/lib/meetings";
import { TX_OPTS, windowState } from "@/lib/store";

const schema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1, "Choose at least 1").max(20, "Maximum 20 per order"),
  size: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(200).optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const d = schema.parse(await req.json());

  const item = await db.item.findUnique({ where: { id: d.itemId } });
  if (!item || !item.isActive) throw new HttpError(404, "This item is not available");

  const mto = item.stockType === "MADE_TO_ORDER";
  if (mto) {
    const w = windowState(item.orderOpensAt, item.orderClosesAt);
    if (w === "NOT_YET") throw new HttpError(409, `Orders open ${fmt(item.orderOpensAt as Date)}`);
    if (w === "CLOSED") throw new HttpError(409, "Orders for this item have closed");
    if (item.sizes.length > 0 && (!d.size || !item.sizes.includes(d.size))) {
      throw new HttpError(400, "Choose a size");
    }
  }

  const order = await db.$transaction(async (tx) => {
    if (!mto) {
      // Atomic stock check: never sells more than is left
      const r = await tx.item.updateMany({
        where: { id: item.id, quantity: { gte: d.quantity } },
        data: { quantity: { decrement: d.quantity } },
      });
      if (r.count === 0) throw new HttpError(409, "Not enough stock left");
    }
    return tx.order.create({
      data: {
        userId: actor.id,
        total: item.price.mul(d.quantity),
        items: {
          create: {
            itemId: item.id,
            size: mto ? (d.size ?? null) : null,
            notes: d.notes || null,
            quantity: d.quantity,
            unitPrice: item.price,
          },
        },
      },
      select: { id: true, total: true },
    });
  }, TX_OPTS);

  await audit(actor.id, "ORDER_PLACED", "Order", order.id, { itemId: item.id, quantity: d.quantity });
  return Response.json({ id: order.id, total: Number(order.total) }, { status: 201 });
});
