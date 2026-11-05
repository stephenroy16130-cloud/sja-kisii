import { get } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { canViewScoped } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const maxDuration = 60;

export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;

  const doc = await db.document.findUnique({ where: { id } });
  // Same answer for "missing" and "not for you", so nobody can probe for files
  if (!doc || !canViewScoped(actor, { audience: doc.audience, crewId: doc.crewId, uploadedById: doc.uploadedById })) {
    throw new HttpError(404, "File not found");
  }

  // Older documents were stored in the database and are served by the older route
  if (!doc.fileUrl.startsWith("blob:")) return Response.redirect(new URL(doc.fileUrl, req.url), 307);

  const result = await get(doc.fileUrl.slice(5), { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200) throw new HttpError(404, "File not found");

  return new Response(result.stream, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});
