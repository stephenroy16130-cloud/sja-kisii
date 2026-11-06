import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniff } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { itemImages, MAX_ITEM_PHOTOS } from "@/lib/shop-images";
import { TX_OPTS } from "@/lib/store";

const fileIdOf = (url: string) => /^\/api\/files\/(.+)$/.exec(url)?.[1];

// Adds one photo to the item
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;

  const item = await db.item.findUnique({ where: { id }, select: { name: true, imageUrl: true, images: true } });
  if (!item) throw new HttpError(404, "Item not found");
  const current = itemImages(item);
  if (current.length >= MAX_ITEM_PHOTOS) throw new HttpError(409, `An item can have up to ${MAX_ITEM_PHOTOS} photos`);

  const file = (await req.formData()).get("photo");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Choose a photo");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "That photo is too large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes) !== "jpeg") throw new HttpError(400, "Upload a JPG or PNG photo");

  await db.$transaction(async (tx) => {
    const stored = await tx.storedFile.create({
      data: { name: "item.jpg", mimeType: "image/jpeg", size: file.size, data: bytes, audience: "GENERAL", uploadedById: actor.id },
      select: { id: true },
    });
    const next = [...current, `/api/files/${stored.id}`];
    await tx.item.update({ where: { id }, data: { images: next, imageUrl: next[0] } });
  }, TX_OPTS);

  await audit(actor.id, "STORE_ITEM_PHOTO_ADDED", "Item", id, { name: item.name });
  return Response.json({ ok: true }, { status: 201 });
});

// Removes one photo, chosen by its address
export const DELETE = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const { url } = z.object({ url: z.string().max(300) }).parse(await req.json());

  const item = await db.item.findUnique({ where: { id }, select: { name: true, imageUrl: true, images: true } });
  if (!item) throw new HttpError(404, "Item not found");
  const current = itemImages(item);
  if (!current.includes(url)) throw new HttpError(404, "Photo not found");

  const next = current.filter((u) => u !== url);
  await db.$transaction(async (tx) => {
    await tx.item.update({ where: { id }, data: { images: next, imageUrl: next[0] ?? null } });
    const fid = fileIdOf(url);
    if (fid) await tx.storedFile.deleteMany({ where: { id: fid } });
  }, TX_OPTS);

  await audit(actor.id, "STORE_ITEM_PHOTO_REMOVED", "Item", id, { name: item.name });
  return Response.json({ ok: true });
});
