import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { canManageQr, EVENT_TYPE, loadEvent, QR_KINDS } from "@/lib/qr";

export const DELETE = route(
  async (_req: Request, ctx: { params: Promise<{ kind: string; id: string; linkId: string }> }) => {
    const actor = await requireUser();
    const p = await ctx.params;
    const kind = z.enum(QR_KINDS).parse(p.kind);

    const e = await loadEvent(kind, { id: p.id });
    if (!e) throw new HttpError(404, "Event not found");
    const link = await db.eventLink.findUnique({ where: { id: p.linkId } });
    if (!link || link.eventId !== e.id || link.kind !== EVENT_TYPE[kind]) throw new HttpError(404, "Link not found");
    if (!canManageQr(actor, e) && link.addedById !== actor.id) throw new HttpError(403, "You cannot remove this link");

    await db.eventLink.delete({ where: { id: link.id } });
    await audit(actor.id, "EVENT_LINK_REMOVED", "EventLink", link.id, { kind, event: e.title });
    return Response.json({ id: link.id });
  }
);
