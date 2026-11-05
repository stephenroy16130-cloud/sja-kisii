import { del } from "@vercel/blob";
import { audit, requireUser } from "@/lib/auth";
import { canModerate } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

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
