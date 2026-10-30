import { requireUser } from "@/lib/auth";
import { canViewScoped } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;

  const f = await db.storedFile.findUnique({ where: { id } });
  // Same answer for "missing" and "not yours", so nobody can probe for files
  if (!f || !canViewScoped(actor, f)) throw new HttpError(404, "File not found");

  const image = f.mimeType.startsWith("image/");
  return new Response(new Blob([new Uint8Array(f.data)], { type: f.mimeType }), {
    headers: {
      "Content-Type": f.mimeType,
      "Content-Disposition": `${image ? "inline" : "attachment"}; filename="${f.name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
});
