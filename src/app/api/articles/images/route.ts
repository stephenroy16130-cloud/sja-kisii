import { after } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniff } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { ARTICLE_PHOTO, sweepArticlePhotos } from "@/lib/photo-cleanup";

// One photo per request, so a big gallery never hits the server's request-size limit
export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const file = (await req.formData()).get("image");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Choose a photo");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "That photo is too large");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes) !== "jpeg") throw new HttpError(400, "Attach JPG or PNG photos only");

  const row = await db.storedFile.create({
    data: {
      name: ARTICLE_PHOTO,
      mimeType: "image/jpeg",
      size: file.size,
      data: bytes,
      audience: "GENERAL",
      uploadedById: actor.id,
    },
    select: { id: true },
  });
  after(() => sweepArticlePhotos());
  return Response.json({ id: row.id }, { status: 201 });
});

// Removes the member's own photos that no article uses (cancelled or failed posts)
export const DELETE = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const { ids } = z.object({ ids: z.array(z.string().min(1)).max(20) }).parse(await req.json());
  if (ids.length === 0) return Response.json({ removed: 0 });

  const used = await db.article.findMany({ where: { images: { hasSome: ids } }, select: { images: true } });
  const inUse = new Set(used.flatMap((a) => a.images));
  const free = ids.filter((i) => !inUse.has(i));
  const r = await db.storedFile.deleteMany({
    where: { id: { in: free }, uploadedById: actor.id, name: ARTICLE_PHOTO },
  });
  return Response.json({ removed: r.count });
});
