import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z
  .object({
    isOpen: z.boolean().optional(),
    closesAt: z.string().datetime().nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine((d) => d.isOpen !== undefined || d.closesAt !== undefined || d.archived !== undefined, {
    message: "Nothing to change",
  });

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

  await db.collection.update({
    where: { id },
    data: {
      ...(d.isOpen !== undefined ? { isOpen: d.isOpen } : {}),
      ...(d.closesAt !== undefined ? { closesAt: d.closesAt ? new Date(d.closesAt) : null } : {}),
      ...(d.archived !== undefined ? { archivedAt: d.archived ? new Date() : null } : {}),
    },
  });
  await audit(
    actor.id,
    d.archived === true ? "COLLECTION_DELETED" : d.archived === false ? "COLLECTION_RESTORED" : d.isOpen === false ? "COLLECTION_CLOSED" : "COLLECTION_UPDATED",
    "Collection",
    id,
    { title: c.title }
  );
  return Response.json({ id });
});
