import { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";
import { TX_OPTS } from "@/lib/store";

const schema = z.object({
  action: z.enum(["pay", "fulfil", "cancel"]),
  receipt: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8,12}$/, "Enter the M-Pesa confirmation code, e.g. QGH7XXXXXX")
    .optional(),
});

const changed = () => new HttpError(409, "This order just changed. Refresh and try again.");

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { action, receipt } = schema.parse(await req.json());
  const finance = can(actor, "finance:manage");

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { item: { select: { stockType: true } } } },
      user: { select: { phone: true } },
    },
  });
  if (!order || (order.userId !== actor.id && !finance)) throw new HttpError(404, "Order not found");
  const isOwner = order.userId === actor.id;

  if (action === "cancel") {
    const allowed =
      (isOwner && order.status === "PENDING_PAYMENT") ||
      (finance && (order.status === "PENDING_PAYMENT" || order.status === "PAID"));
    if (!allowed) throw new HttpError(409, "This order can no longer be cancelled");

    await db.$transaction(async (tx) => {
      const r = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: "CANCELLED" } });
      if (r.count === 0) throw changed();
      for (const oi of order.items) {
        if (oi.item.stockType === "READY_STOCK") {
          await tx.item.update({ where: { id: oi.itemId }, data: { quantity: { increment: oi.quantity } } });
        }
      }
    }, TX_OPTS);
  } else if (action === "pay") {
    if (!finance) throw new HttpError(403, "Only DO Finance can confirm payments");
    if (order.status !== "PENDING_PAYMENT") throw new HttpError(409, "This order is not awaiting payment");
    if (!receipt) throw new HttpError(400, "Enter the M-Pesa confirmation code");

    try {
      await db.$transaction(async (tx) => {
        const r = await tx.order.updateMany({ where: { id, status: "PENDING_PAYMENT" }, data: { status: "PAID" } });
        if (r.count === 0) throw changed();
        await tx.transaction.create({
          data: {
            userId: order.userId,
            purpose: "STORE_ORDER",
            amount: order.total,
            phone: order.user.phone,
            status: "SUCCESS",
            mpesaReceipt: receipt,
            orderId: id,
          },
        });
      }, TX_OPTS);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new HttpError(409, "That M-Pesa code has already been used");
      }
      throw e;
    }
  } else {
    if (!finance) throw new HttpError(403, "Only DO Finance can mark orders collected");
    if (order.status !== "PAID") throw new HttpError(409, "Only paid orders can be marked collected");
    const r = await db.order.updateMany({ where: { id, status: "PAID" }, data: { status: "FULFILLED" } });
    if (r.count === 0) throw changed();
  }

  const status = action === "cancel" ? "CANCELLED" : action === "pay" ? "PAID" : "FULFILLED";
  await audit(actor.id, `ORDER_${status}`, "Order", id, { receipt: receipt ?? null });
  return Response.json({ id, status });
});
