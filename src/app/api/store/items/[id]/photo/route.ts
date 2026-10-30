import { audit, requirePermission } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniff } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

const fileIdOf = (url: string | null) => (url ? /^\/api\/files\/(.+)$/.exec(url)?.[1] : undefined);

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;

  const item = await db.item.findUnique({ where: { id }, select: { name: true, imageUrl: true } });
  if (!item) throw new HttpError(404, "Item not found");

  const file = (await req.formData()).get("photo");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Choose a photo");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "That photo is too large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes) !== "jpeg") throw new HttpError(400, "Upload a JPG or PNG photo");

  await db.$transaction(async (tx) => {
    const stored = await tx.storedFile.create({
      data: {
        name: "item.jpg",
        mimeType: "image/jpeg",
        size: file.size,
        data: bytes,
        audience: "GENERAL",
        uploadedById: actor.id,
      },
      select: { id: true },
    });
    await tx.item.update({ where: { id }, data: { imageUrl: `/api/files/${stored.id}` } });
    const old = fileIdOf(item.imageUrl);
    if (old) await tx.storedFile.deleteMany({ where: { id: old } });
  }, TX_OPTS);

  await audit(actor.id, "STORE_ITEM_PHOTO_SET", "Item", id, { name: item.name });
  return Response.json({ ok: true });
});

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;

  const item = await db.item.findUnique({ where: { id }, select: { name: true, imageUrl: true } });
  if (!item) throw new HttpError(404, "Item not found");

  await db.$transaction(async (tx) => {
    await tx.item.update({ where: { id }, data: { imageUrl: null } });
    const old = fileIdOf(item.imageUrl);
    if (old) await tx.storedFile.deleteMany({ where: { id: old } });
  }, TX_OPTS);

  await audit(actor.id, "STORE_ITEM_PHOTO_REMOVED", "Item", id, { name: item.name });
  return Response.json({ ok: true });
});
