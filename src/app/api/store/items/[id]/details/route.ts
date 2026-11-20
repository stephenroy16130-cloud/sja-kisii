import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { itemImages } from "@/lib/shop-images";

const fileIdOf = (url: string) => /^\/api\/files\/(.+)$/.exec(url)?.[1];

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const item = await db.item.findUnique({ where: { id }, select: { name: true, price: true, description: true } });
  if (!item) throw new HttpError(404, "Item not found");
  return Response.json({ name: item.name, price: Number(String(item.price)), description: item.description ?? "" });
});

const schema = z.object({
  name: z.string().trim().min(2, "Give the item a name").max(100),
  price: z.number().int("Use whole shillings").min(1).max(1_000_000),
  description: z.string().trim().max(500).optional(),
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const d = schema.parse(await req.json());
  if (!(await db.item.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, "Item not found");

  await db.item.update({ where: { id }, data: { name: d.name, price: d.price, description: d.description || null } });
  await audit(actor.id, "STORE_ITEM_EDITED", "Item", id, { name: d.name });
  return Response.json({ id });
});

// Never ordered: removed for good. Ordered before: hidden everywhere, so old orders still show what was bought.
export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const item = await db.item.findUnique({ where: { id }, select: { name: true, imageUrl: true, images: true } });
  if (!item) throw new HttpError(404, "Item not found");

  const fileIds = itemImages(item).map(fileIdOf).filter((x): x is string => Boolean(x));
  const ordered = await db.orderItem.count({ where: { itemId: id } });

  if (ordered === 0) {
    await db.$transaction([
      db.storedFile.deleteMany({ where: { id: { in: fileIds } } }),
      db.item.delete({ where: { id } }),
    ]);
  } else {
    await db.$transaction([
      db.storedFile.deleteMany({ where: { id: { in: fileIds } } }),
      db.item.update({ where: { id }, data: { archivedAt: new Date(), isActive: false, images: [], imageUrl: null } }),
    ]);
  }

  await audit(actor.id, ordered === 0 ? "STORE_ITEM_DELETED" : "STORE_ITEM_ARCHIVED", "Item", id, { name: item.name, ordered });
  return Response.json({ result: ordered === 0 ? "deleted" : "archived" });
});
