import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { checkTarget } from "@/lib/content";
import { db } from "@/lib/db";
import { LINK_ERROR, linkLabel, parseGoogleLink } from "@/lib/google-links";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  description: z.string().trim().max(500).default(""),
  audience: z.enum(["GENERAL", "CREW", "BAND"]),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
  url: z.string().trim().max(600),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("content:create");
  const d = schema.parse(await req.json());

  const crewId = d.audience === "CREW" ? (d.crewId ?? null) : null;
  const denied = checkTarget(actor, d.audience, crewId);
  if (denied) throw new HttpError(403, denied);

  const url = parseGoogleLink(d.url);
  if (!url) throw new HttpError(400, LINK_ERROR);

  // A link has no file: the address itself is stored
  const doc = await db.document.create({
    data: {
      title: d.title,
      description: d.description || null,
      fileUrl: url,
      fileName: linkLabel(url),
      fileSize: 0,
      mimeType: "text/uri-list",
      audience: d.audience,
      crewId,
      uploadedById: actor.id,
    },
    select: { id: true, title: true },
  });
  await audit(actor.id, "DOCUMENT_LINK_ADDED", "Document", doc.id, { title: doc.title, audience: d.audience, crewId });
  return Response.json(doc, { status: 201 });
});
