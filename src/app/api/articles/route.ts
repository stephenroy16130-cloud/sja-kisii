import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { checkTarget, cleanHtml, MAX_IMAGE_BYTES, MAX_IMAGES, plainText, safeName, sniff } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const form = await req.formData();

  const title = z.string().trim().min(3, "Title is too short").max(150).parse(String(form.get("title") ?? ""));
  const html = cleanHtml(String(form.get("content") ?? ""));
  if (plainText(html).length < 10) throw new HttpError(400, "Write the article text (at least 10 characters)");
  if (html.length > 50_000) throw new HttpError(413, "That article is too long");

  const audience = z.enum(["GENERAL", "CREW", "BAND"]).parse(String(form.get("audience") ?? ""));
  const crewRaw = form.get("crewId");
  const crewId = audience === "CREW" && crewRaw ? Number(crewRaw) : null;
  const denied = checkTarget(actor, audience, crewId);
  if (denied) throw new HttpError(403, denied);
  const notifyMembers = form.get("notifyMembers") === "true";

  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) throw new HttpError(400, `You can attach up to ${MAX_IMAGES} images`);
  const prepared: { name: string; size: number; bytes: Uint8Array<ArrayBuffer> }[] = [];
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) throw new HttpError(413, "One of the images is too large");
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (sniff(bytes) !== "jpeg") throw new HttpError(400, "Attach JPG or PNG images only");
    prepared.push({ name: safeName(f.name), size: f.size, bytes });
  }

  const article = await db.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const p of prepared) {
      const row = await tx.storedFile.create({
        data: { name: p.name, mimeType: "image/jpeg", size: p.size, data: p.bytes, audience, crewId, uploadedById: actor.id },
        select: { id: true },
      });
      ids.push(row.id);
    }
    return tx.article.create({
      data: { title, content: html, images: ids, audience, crewId, notifyMembers, authorId: actor.id },
      select: { id: true, title: true },
    });
  }, TX_OPTS);

  await audit(actor.id, "ARTICLE_POSTED", "Article", article.id, { title: article.title, audience, crewId });
  return Response.json(article, { status: 201 });
});
