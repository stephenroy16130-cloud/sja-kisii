import { after } from "next/server";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { checkTarget, cleanHtml, plainText } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyAudience } from "@/lib/push";
import { TX_OPTS } from "@/lib/store";

const MAX_IMAGES = 10;

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  content: z.string().max(100_000),
  audience: z.enum(["GENERAL", "CREW", "BAND"]),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
  notifyMembers: z.boolean().default(false),
  imageIds: z.array(z.string().min(1)).max(MAX_IMAGES, `You can attach up to ${MAX_IMAGES} photos`).default([]),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const d = schema.parse(await req.json());

  const html = cleanHtml(d.content);
  if (plainText(html).length < 10) throw new HttpError(400, "Write the article text (at least 10 characters)");
  if (html.length > 50_000) throw new HttpError(413, "That article is too long");

  const crewId = d.audience === "CREW" ? (d.crewId ?? null) : null;
  const denied = checkTarget(actor, d.audience, crewId);
  if (denied) throw new HttpError(403, denied);

  const ids = [...new Set(d.imageIds)];
  const article = await db.$transaction(async (tx) => {
    if (ids.length) {
      // The photos were uploaded one by one. Now they take the article's audience.
      const claimed = await tx.storedFile.updateMany({
        where: { id: { in: ids }, uploadedById: actor.id, mimeType: "image/jpeg" },
        data: { audience: d.audience, crewId },
      });
      if (claimed.count !== ids.length) throw new HttpError(400, "A photo was not found. Please attach it again.");
    }
    return tx.article.create({
      data: {
        title: d.title,
        content: html,
        images: ids,
        audience: d.audience,
        crewId,
        notifyMembers: d.notifyMembers,
        authorId: actor.id,
      },
      select: { id: true, title: true },
    });
  }, TX_OPTS);

  await audit(actor.id, "ARTICLE_POSTED", "Article", article.id, { title: article.title, audience: d.audience, crewId });
  if (d.notifyMembers) {
    after(() =>
      notifyAudience(
        d.audience,
        crewId,
        { title: article.title, body: plainText(html).slice(0, 120), url: "/dashboard/articles", tag: "article" },
        actor.id
      )
    );
  }
  return Response.json(article, { status: 201 });
});
