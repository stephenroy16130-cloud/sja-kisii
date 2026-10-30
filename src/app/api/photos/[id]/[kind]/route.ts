import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string; kind: string }> }) => {
  const actor = await requireUser();
  const { id, kind } = await ctx.params;
  if (kind !== "official" && kind !== "social") throw new HttpError(404, "Not found");

  // Official photos: the owner and the DO Admin only. Social photos: any signed-in member.
  if (kind === "official" && actor.id !== id && !can(actor, "user:manage_accounts")) {
    throw new HttpError(403, "You do not have permission to see this photo");
  }

  const photo = await db.userPhoto.findUnique({
    where: { userId_kind: { userId: id, kind: kind === "official" ? "OFFICIAL" : "SOCIAL" } },
    select: { data: true },
  });
  if (!photo) throw new HttpError(404, "No photo");

  return new Response(new Blob([new Uint8Array(photo.data)], { type: "image/jpeg" }), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=604800" },
  });
});
