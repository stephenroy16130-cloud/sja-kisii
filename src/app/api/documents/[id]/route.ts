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

  const fileId = /^\/api\/files\/(.+)$/.exec(doc.fileUrl)?.[1];
  await db.$transaction(async (tx) => {
    if (fileId) await tx.storedFile.deleteMany({ where: { id: fileId } });
    await tx.document.delete({ where: { id } });
  }, TX_OPTS);

  await audit(actor.id, "DOCUMENT_DELETED", "Document", id, { title: doc.title });
  return Response.json({ id });
});
