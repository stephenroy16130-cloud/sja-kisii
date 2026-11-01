import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { settle, stkQuery } from "@/lib/mpesa";
import { can } from "@/lib/rbac";

export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;

  const t = await db.transaction.findUnique({ where: { id } });
  if (!t || (t.userId !== actor.id && !can(actor, "finance:manage"))) throw new HttpError(404, "Payment not found");

  // If the callback has not arrived, ask Daraja directly. This also works when testing from localhost.
  const verify = new URL(req.url).searchParams.get("verify") === "1";
  if (t.status === "PENDING" && verify && t.checkoutRequestId && Date.now() - t.createdAt.getTime() > 15_000) {
    const q = await stkQuery(t.checkoutRequestId).catch(() => null);
    if (q) await settle(t.checkoutRequestId, { resultCode: q.resultCode, resultDesc: q.resultDesc });
  }

  const now = await db.transaction.findUnique({
    where: { id },
    select: { status: true, resultDesc: true, mpesaReceipt: true },
  });
  return Response.json({
    status: now?.status ?? t.status,
    message: now?.resultDesc ?? null,
    receipt: now?.mpesaReceipt ?? null,
  });
});
