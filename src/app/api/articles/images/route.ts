import { requirePermission } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniff } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

// One photo per request, so a big gallery never hits the server's request-size limit
export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const file = (await req.formData()).get("image");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Choose a photo");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "That photo is too large");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes) !== "jpeg") throw new HttpError(400, "Attach JPG or PNG photos only");

  const row = await db.storedFile.create({
    data: { name: "photo.jpg", mimeType: "image/jpeg", size: file.size, data: bytes, audience: "GENERAL", uploadedById: actor.id },
    select: { id: true },
  });
  return Response.json({ id: row.id }, { status: 201 });
});
