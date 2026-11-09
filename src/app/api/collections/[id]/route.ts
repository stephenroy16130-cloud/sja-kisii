import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z
  .object({ isOpen: z.boolean().optional(), closesAt: z.string().datetime().nullable().optional() })
  .refine((d) => d.isOpen !== undefined || d.closesAt !== undefined, { message: "Nothing to change" });

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const d = schema.parse(await req.json());

  const c = await db.collection.findUnique({ where: { id } });
  if (!c) throw new HttpError(404, "Activity not found");

  await db.collection.update({
    where: { id },
    data: {
      ...(d.isOpen !== undefined ? { isOpen: d.isOpen } : {}),
      ...(d.closesAt !== undefined ? { closesAt: d.closesAt ? new Date(d.closesAt) : null } : {}),
    },
  });
  await audit(actor.id, d.isOpen === false ? "COLLECTION_CLOSED" : "COLLECTION_UPDATED", "Collection", id, { title: c.title });
  return Response.json({ id });
});
