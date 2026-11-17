import { del } from "@vercel/blob";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { canModerate } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

const edit = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  description: z.string().trim().max(500).optional(),
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const d = edit.parse(await req.json());

  const doc = await db.document.findUnique({ where: { id }, select: { uploadedById: true } });
  if (!doc) throw new HttpError(404, "Document not found");
  if (!canModerate(actor) && doc.uploadedById !== actor.id) {
    throw new HttpError(403, "Only the uploader or the DO Admin can edit this document");
  }

  await db.document.update({ where: { id }, data: { title: d.title, description: d.description || null } });
  await audit(actor.id, "DOCUMENT_EDITED", "Document", id, { title: d.title });
  return Response.json({ id });
});

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) throw new HttpError(404, "Document not found");
  if (!canModerate(actor) && doc.uploadedById !== actor.id) {
    throw new HttpError(403, "Only the uploader or the DO Admin can delete this document");
  }

  const blobPath = doc.fileUrl.startsWith("blob:") ? doc.fileUrl.slice(5) : null;
  const legacyId = /^\/api\/files\/(.+)$/.exec(doc.fileUrl)?.[1];
  await db.$transaction(async (tx) => {
    if (legacyId) await tx.storedFile.deleteMany({ where: { id: legacyId } });
    await tx.document.delete({ where: { id } });
  }, TX_OPTS);

  if (blobPath) {
    try {
      await del(blobPath);
    } catch (e) {
      console.error("Could not delete the stored file", e);
    }
  }

  await audit(actor.id, "DOCUMENT_DELETED", "Document", id, { title: doc.title });
  return Response.json({ id });
});
