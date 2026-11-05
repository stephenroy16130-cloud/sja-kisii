import type { TransactionPurpose } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { IN_PROGRESS_MS, registrationFee, stkPush, whole } from "@/lib/mpesa";
import { phoneSchema } from "@/lib/validation";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("order"), orderId: z.string().min(1), phone: phoneSchema }),
  z.object({ kind: z.literal("announcement"), announcementId: z.string().min(1), phone: phoneSchema }),
  z.object({ kind: z.literal("registration"), phone: phoneSchema }),
]);

const busy = () => new HttpError(409, "A payment is already in progress. Check your phone, or wait a minute.");

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const d = schema.parse(await req.json());

  // Stops anyone spamming prompts at a phone number
  const recent = await db.transaction.count({
    where: { userId: actor.id, createdAt: { gte: new Date(Date.now() - 600_000) } },
  });
  if (recent >= 5) throw new HttpError(429, "Too many payment attempts. Wait a few minutes and try again.");
  const fresh = new Date(Date.now() - IN_PROGRESS_MS);

  let purpose: TransactionPurpose;
  let amount: number;
  let reference: string;
  let desc: string;
  let orderId: string | undefined;
  let announcementId: string | undefined;

  if (d.kind === "order") {
    const order = await db.order.findUnique({ where: { id: d.orderId } });
    if (!order || order.userId !== actor.id) throw new HttpError(404, "Order not found");
    if (order.status !== "PENDING_PAYMENT") throw new HttpError(409, "This order is not awaiting payment");
    if (await db.transaction.count({ where: { orderId: order.id, status: "PENDING", createdAt: { gte: fresh } } })) {
      throw busy();
    }
    purpose = "STORE_ORDER";
    amount = whole(order.total);
    reference = "ORD" + order.id.slice(-6).toUpperCase();
    desc = "Shop order";
    orderId = order.id;
  } else if (d.kind === "announcement") {
    const a = await db.announcement.findUnique({ where: { id: d.announcementId } });
    if (!a || !a.paymentAmount) throw new HttpError(404, "There is nothing to pay here");
    if (a.crewId !== actor.crewId) throw new HttpError(403, "This payment is for another crew");
    if (await db.transaction.count({ where: { userId: actor.id, announcementId: a.id, status: "SUCCESS" } })) {
      throw new HttpError(409, "You have already paid for this");
    }
    if (
      await db.transaction.count({
        where: { userId: actor.id, announcementId: a.id, status: "PENDING", createdAt: { gte: fresh } },
      })
    ) {
      throw busy();
    }
    purpose = "CREW_EVENT";
    amount = whole(a.paymentAmount);
    reference = "CREW" + a.id.slice(-6).toUpperCase();
    desc = "Crew event";
    announcementId = a.id;
  } else {
    const fee = await registrationFee();
    if (!fee) throw new HttpError(400, "There is no registration fee to pay");
    if (await db.transaction.count({ where: { userId: actor.id, purpose: "REGISTRATION_FEE", status: "SUCCESS" } })) {
      throw new HttpError(409, "You have already paid the registration fee");
    }
    if (
      await db.transaction.count({
        where: { userId: actor.id, purpose: "REGISTRATION_FEE", status: "PENDING", createdAt: { gte: fresh } },
      })
    ) {
      throw busy();
    }
    purpose = "REGISTRATION_FEE";
    amount = fee;
    reference = "REGFEE";
    desc = "Reg fee";
  }

  const tx = await db.transaction.create({
    data: { userId: actor.id, purpose, amount, phone: d.phone, orderId, announcementId },
    select: { id: true },
  });

  try {
    const r = await stkPush({ phone: d.phone, amount, reference, desc });
    await db.transaction.update({
      where: { id: tx.id },
      data: { checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId },
    });
    await audit(actor.id, "MPESA_STK_SENT", "Transaction", tx.id, { purpose, amount });
    return Response.json({ id: tx.id, message: r.message }, { status: 201 });
  } catch (e) {
    await db.transaction.update({
      where: { id: tx.id },
      data: { status: "FAILED", resultDesc: (e instanceof Error ? e.message : "Request failed").slice(0, 250) },
    });
    throw e;
  }
});
