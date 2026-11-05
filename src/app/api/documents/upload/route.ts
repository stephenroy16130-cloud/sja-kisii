import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { checkTarget } from "@/lib/content";
import { DOC_MIME, MAX_DOC_BYTES } from "@/lib/doc-files";
import { HttpError, route } from "@/lib/http";

const payload = z.object({
  audience: z.enum(["GENERAL", "CREW", "BAND"]),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
});

export const POST = route(async (req: Request) => {
  const body = (await req.json()) as HandleUploadBody;
  const json = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const actor = await requirePermission("content:create");

      let p;
      try {
        p = payload.parse(JSON.parse(clientPayload ?? "{}"));
      } catch {
        throw new HttpError(400, "Invalid upload request");
      }
      const crewId = p.audience === "CREW" ? (p.crewId ?? null) : null;
      const denied = checkTarget(actor, p.audience, crewId);
      if (denied) throw new HttpError(403, denied);
      // Each member can only upload into their own folder
      if (!pathname.startsWith(`documents/${actor.id}/`)) throw new HttpError(400, "Invalid upload location");

      return {
        allowedContentTypes: Object.values(DOC_MIME),
        maximumSizeInBytes: MAX_DOC_BYTES,
        addRandomSuffix: true,
      };
    },
  });
  return Response.json(json);
});
