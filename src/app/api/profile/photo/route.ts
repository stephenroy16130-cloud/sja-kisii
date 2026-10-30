import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const MAX_BYTES = 300_000;

// Members upload their own photos only. The browser has already cropped and shrunk it to a JPEG.
export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const form = await req.formData();
  const kind = z.enum(["OFFICIAL", "SOCIAL"]).parse(form.get("kind"));

  const file = form.get("photo");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a photo");
  if (file.size > MAX_BYTES) throw new HttpError(413, "That photo is too large");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) throw new HttpError(400, "Upload a JPG or PNG photo");

  await db.$transaction([
    db.userPhoto.upsert({
      where: { userId_kind: { userId: actor.id, kind } },
      update: { data: bytes },
      create: { userId: actor.id, kind, data: bytes },
    }),
    db.user.update({
      where: { id: actor.id },
      data: kind === "OFFICIAL" ? { officialPhotoAt: new Date() } : { socialPhotoAt: new Date() },
    }),
  ]);
  return Response.json({ ok: true });
});
