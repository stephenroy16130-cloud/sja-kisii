import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LINK_ERROR, parseGoogleLink } from "@/lib/google-links";
import { HttpError, route } from "@/lib/http";
import { canManageQr, EVENT_TYPE, loadEvent, QR_KINDS } from "@/lib/qr";

const schema = z.object({
  title: z.string().trim().min(2, "Give the link a title").max(100),
  url: z.string().trim().max(600),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const d = schema.parse(await req.json());

  const e = await loadEvent(kind, { id: p.id });
  if (!e) throw new HttpError(404, "Event not found");
  if (!canManageQr(actor, e)) throw new HttpError(403, "Only the person in charge of this event can add links");

  const url = parseGoogleLink(d.url);
  if (!url) throw new HttpError(400, LINK_ERROR);
  if ((await db.eventLink.count({ where: { kind: EVENT_TYPE[kind], eventId: e.id } })) >= 10) {
    throw new HttpError(409, "An event can have up to 10 links");
  }

  const link = await db.eventLink.create({
    data: { kind: EVENT_TYPE[kind], eventId: e.id, title: d.title, url, addedById: actor.id },
    select: { id: true },
  });
  await audit(actor.id, "EVENT_LINK_ADDED", "EventLink", link.id, { kind, event: e.title });
  return Response.json(link, { status: 201 });
});
