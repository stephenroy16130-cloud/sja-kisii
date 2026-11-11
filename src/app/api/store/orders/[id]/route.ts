import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";

// A cancelled order can be deleted for good. An order that was ever paid cannot, so the payment stays on record.
export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;

  const order = await db.order.findUnique({ where: { id }, include: { transactions: { select: { status: true } } } });
  if (!order || (order.userId !== actor.id && !can(actor, "finance:manage"))) throw new HttpError(404, "Order not found");
  if (order.status !== "CANCELLED") throw new HttpError(409, "Only cancelled orders can be deleted");
  if (order.transactions.some((t) => t.status === "SUCCESS")) {
    throw new HttpError(409, "A payment was made for this order, so it has to stay on record. Ask DO Finance about the refund.");
  }

  await db.$transaction([
    db.transaction.deleteMany({ where: { orderId: id } }),
    db.order.delete({ where: { id } }),
  ]);
  await audit(actor.id, "ORDER_DELETED", "Order", id);
  return Response.json({ id });
});
