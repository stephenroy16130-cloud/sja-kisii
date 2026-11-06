import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { canModerate, cleanHtml, plainText } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

// Moderation: unpublish, republish, delete
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { action } = z.object({ action: z.enum(["unpublish", "publish", "delete"]) }).parse(await req.json());

  const a = await db.article.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Article not found");
  const mod = canModerate(actor);

  if (action === "delete") {
    if (!mod && a.authorId !== actor.id) throw new HttpError(403, "You can only delete your own articles");
    await db.$transaction(async (tx) => {
      await tx.storedFile.deleteMany({ where: { id: { in: a.images } } });
      await tx.article.delete({ where: { id } });
    }, TX_OPTS);
  } else {
    if (!mod) throw new HttpError(403, "Only the DO Admin can moderate articles");
    await db.article.update({
      where: { id },
      data: { isPublished: action === "publish", moderatedById: actor.id, moderatedAt: new Date() },
    });
  }

  await audit(actor.id, `ARTICLE_${action.toUpperCase()}`, "Article", id, { title: a.title });
  return Response.json({ id, action });
});

// Editing: only the author
const editSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  content: z.string().max(100_000),
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const d = editSchema.parse(await req.json());

  const a = await db.article.findUnique({ where: { id }, select: { authorId: true } });
  if (!a) throw new HttpError(404, "Article not found");
  if (a.authorId !== actor.id) throw new HttpError(403, "You can only edit your own articles");

  const html = cleanHtml(d.content);
  if (plainText(html).length < 10) throw new HttpError(400, "Write the article text (at least 10 characters)");
  if (html.length > 50_000) throw new HttpError(413, "That article is too long");

  await db.article.update({ where: { id }, data: { title: d.title, content: html } });
  await audit(actor.id, "ARTICLE_EDITED", "Article", id, { title: d.title });
  return Response.json({ id });
});
