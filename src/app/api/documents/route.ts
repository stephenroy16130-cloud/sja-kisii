import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { checkTarget, MAX_DOC_BYTES, safeName, sniff } from "@/lib/content";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const form = await req.formData();

  const title = z.string().trim().min(3, "Title is too short").max(150).parse(String(form.get("title") ?? ""));
  const description = z.string().trim().max(500).parse(String(form.get("description") ?? ""));
  const audience = z.enum(["GENERAL", "CREW", "BAND"]).parse(String(form.get("audience") ?? ""));
  const crewRaw = form.get("crewId");
  const crewId = audience === "CREW" && crewRaw ? Number(crewRaw) : null;
  const denied = checkTarget(actor, audience, crewId);
  if (denied) throw new HttpError(403, denied);

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Choose a file");
  if (file.size > MAX_DOC_BYTES) throw new HttpError(413, "That file is too large (4 MB maximum)");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  const lower = file.name.toLowerCase();
  const ok =
    (kind === "pdf" && lower.endsWith(".pdf")) ||
    (kind === "docx" && lower.endsWith(".docx")) ||
    (kind === "doc" && lower.endsWith(".doc"));
  if (!ok) throw new HttpError(400, "Upload a PDF or Word document (.pdf, .doc, .docx)");
  const mimeType =
    kind === "pdf"
      ? "application/pdf"
      : kind === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/msword";
  const name = safeName(file.name);

  const doc = await db.$transaction(async (tx) => {
    const stored = await tx.storedFile.create({
      data: { name, mimeType, size: file.size, data: bytes, audience, crewId, uploadedById: actor.id },
      select: { id: true },
    });
    return tx.document.create({
      data: {
        title,
        description: description || null,
        fileUrl: `/api/files/${stored.id}`,
        fileName: name,
        fileSize: file.size,
        mimeType,
        audience,
        crewId,
        uploadedById: actor.id,
      },
      select: { id: true, title: true },
    });
  }, TX_OPTS);

  await audit(actor.id, "DOCUMENT_UPLOADED", "Document", doc.id, { title: doc.title, audience, crewId });
  return Response.json(doc, { status: 201 });
});
