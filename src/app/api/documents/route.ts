import { get } from "@vercel/blob";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { checkTarget, safeName } from "@/lib/content";
import { db } from "@/lib/db";
import { DOC_MIME, docExt, MAX_DOC_BYTES } from "@/lib/doc-files";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  description: z.string().trim().max(500).default(""),
  audience: z.enum(["GENERAL", "CREW", "BAND"]),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
  pathname: z.string().min(5).max(300),
  fileName: z.string().trim().min(1).max(160),
  size: z.number().int().min(1).max(MAX_DOC_BYTES),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const d = schema.parse(await req.json());

  const crewId = d.audience === "CREW" ? (d.crewId ?? null) : null;
  const denied = checkTarget(actor, d.audience, crewId);
  if (denied) throw new HttpError(403, denied);

  if (!d.pathname.startsWith(`documents/${actor.id}/`)) throw new HttpError(400, "Invalid upload");
  const ext = docExt(d.fileName);
  if (!ext) throw new HttpError(400, "Upload a PDF or Word document (.pdf, .doc, .docx)");

  // Make sure the file really arrived in storage
  const found = await get(d.pathname, { access: "private" }).catch(() => null);
  if (!found || found.statusCode !== 200) throw new HttpError(400, "The upload did not finish. Please try again.");
  try {
    await found.stream?.cancel();
  } catch {
    // the check is done; an unread stream is fine
  }

  if (await db.document.findFirst({ where: { fileUrl: `blob:${d.pathname}` }, select: { id: true } })) {
    throw new HttpError(409, "This file is already published");
  }

  const name = safeName(d.fileName);
  const doc = await db.document.create({
    data: {
      title: d.title,
      description: d.description || null,
      fileUrl: `blob:${d.pathname}`,
      fileName: name,
      fileSize: d.size,
      mimeType: DOC_MIME[ext],
      audience: d.audience,
      crewId,
      uploadedById: actor.id,
    },
    select: { id: true, title: true },
  });
  await audit(actor.id, "DOCUMENT_UPLOADED", "Document", doc.id, { title: doc.title, audience: d.audience, crewId });
  return Response.json(doc, { status: 201 });
});
