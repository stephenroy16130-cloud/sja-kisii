import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z
  .object({
    isOpen: z.boolean().optional(),
    closesAt: z.string().datetime().nullable().optional(),
    archived: z.boolean().optional(),
    title: z.string().trim().min(3, "Title is too short").max(120).optional(),
    description: z.string().trim().max(500).optional(),
    amount: z.number().int("Use whole shillings").min(1).max(100_000).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Nothing to change" });

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const d = schema.parse(await req.json());

  const c = await db.collection.findUnique({ where: { id } });
  if (!c) throw new HttpError(404, "Activity not found");

  // Deleting only hides it. The payments linked to it stay on record.
  if (d.archived === true && c.isOpen && (!c.closesAt || c.closesAt > new Date())) {
    throw new HttpError(409, "Close the payments first. Only a closed activity can be deleted.");
  }
  // The price is locked once anyone has paid, so everybody pays the same
  if (d.amount !== undefined && d.amount !== c.amount) {
    const paid = await db.transaction.count({ where: { collectionId: id, status: "SUCCESS" } });
    if (paid > 0) throw new HttpError(409, "Payments were already made at the old price, so the price can no longer be changed.");
  }

  await db.collection.update({
    where: { id },
    data: {
      ...(d.isOpen !== undefined ? { isOpen: d.isOpen } : {}),
      ...(d.closesAt !== undefined ? { closesAt: d.closesAt ? new Date(d.closesAt) : null } : {}),
      ...(d.archived !== undefined ? { archivedAt: d.archived ? new Date() : null } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.amount !== undefined ? { amount: d.amount } : {}),
    },
  });

  const edited = d.title !== undefined || d.description !== undefined || d.amount !== undefined;
  await audit(
    actor.id,
    d.archived === true
      ? "COLLECTION_DELETED"
      : d.archived === false
        ? "COLLECTION_RESTORED"
        : d.isOpen === false
          ? "COLLECTION_CLOSED"
          : edited
            ? "COLLECTION_EDITED"
            : "COLLECTION_UPDATED",
    "Collection",
    id,
    { title: d.title ?? c.title }
  );
  return Response.json({ id });
});
