import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

export const maxDuration = 60;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// Permanently removes a plain member and their personal records
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("user:manage_accounts");
  const { id } = await ctx.params;
  const { confirmName } = z.object({ confirmName: z.string().min(1).max(120) }).parse(await req.json());

  const t = await db.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, crewId: true, titles: true, isSuperintendent: true, isDeveloper: true },
  });
  if (!t || t.isDeveloper) throw new HttpError(404, "Member not found");
  if (t.id === actor.id) throw new HttpError(400, "You cannot remove yourself");
  if (t.isSuperintendent || t.titles.length > 0) {
    throw new HttpError(403, "Leaders cannot be removed here. The Superintendent must take away their titles first.");
  }
  if (norm(confirmName) !== norm(t.fullName)) throw new HttpError(400, "The name you typed does not match.");

  await db.$transaction(async (tx) => {
    // Unpaid orders had reserved stock. Put it back.
    const unpaid = await tx.order.findMany({
      where: { userId: id, status: "PENDING_PAYMENT" },
      include: { items: { include: { item: { select: { stockType: true } } } } },
    });
    for (const o of unpaid) {
      for (const oi of o.items) {
        if (oi.item.stockType === "READY_STOCK") {
          await tx.item.update({ where: { id: oi.itemId }, data: { quantity: { increment: oi.quantity } } });
        }
      }
    }

    // What they created stays with the division. It moves to the DO Admin doing the removal.
    await tx.meeting.updateMany({ where: { createdById: id }, data: { createdById: actor.id } });
    await tx.fieldOp.updateMany({ where: { createdById: id }, data: { createdById: actor.id } });
    await tx.training.updateMany({ where: { createdById: id }, data: { createdById: actor.id } });
    await tx.announcement.updateMany({ where: { createdById: id }, data: { createdById: actor.id } });
    await tx.article.updateMany({ where: { authorId: id }, data: { authorId: actor.id } });
    await tx.document.updateMany({ where: { uploadedById: id }, data: { uploadedById: actor.id } });
    await tx.attendanceRecord.updateMany({ where: { recordedById: id }, data: { recordedById: actor.id } });
    await tx.instrumentIssuanceLog.updateMany({ where: { issuedById: id }, data: { issuedById: actor.id } });
    await tx.membershipRequest.updateMany({ where: { requestedById: id }, data: { requestedById: actor.id } });

    // Their own records are deleted
    await tx.transaction.deleteMany({ where: { userId: id } });
    await tx.order.deleteMany({ where: { userId: id } });
    await tx.attendanceRecord.deleteMany({ where: { userId: id } });
    await tx.apology.deleteMany({ where: { userId: id } });
    await tx.announcementRsvp.deleteMany({ where: { userId: id } });
    await tx.membershipRequest.deleteMany({ where: { targetUserId: id } });
    await tx.instrumentIssuanceLog.deleteMany({ where: { issuedToId: id } });

    // Their name may sit in the stored top five of past weeks. Blank it.
    const results = await tx.weeklyResult.findMany({
      orderBy: { weekStart: "desc" },
      take: 300,
      select: { id: true, topFive: true },
    });
    for (const r of results) {
      if (!Array.isArray(r.topFive)) continue;
      const list = r.topFive as { userId?: string | null; name?: string }[];
      if (!list.some((x) => x?.userId === id)) continue;
      await tx.weeklyResult.update({
        where: { id: r.id },
        data: {
          topFive: list.map((x) => (x?.userId === id ? { ...x, userId: null, name: "Former member" } : x)) as Prisma.InputJsonValue,
        },
      });
    }

    // Photos, devices, passkeys, check-ins and reset links go with the account
    await tx.user.delete({ where: { id } });
  }, TX_OPTS);

  // The audit entry keeps only the id, so no personal details are retained
  await audit(actor.id, "MEMBER_REMOVED", "User", id, { crewId: t.crewId });
  return Response.json({ removed: true });
});
