import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { canManageQr, loadEvent, makeToken, QR_KINDS, updateQr } from "@/lib/qr";

const schema = z.object({ action: z.enum(["enable", "disable", "regenerate"]) });

export const PUT = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const { action } = schema.parse(await req.json());

  const e = await loadEvent(kind, { id: p.id });
  if (!e) throw new HttpError(404, "Event not found");
  if (!canManageQr(actor, e)) throw new HttpError(403, "You do not have permission to change this");
  if (action === "enable" && e.qrToken) throw new HttpError(409, "QR check-in is already on");
  if (action !== "enable" && !e.qrToken) throw new HttpError(409, "QR check-in is not on");

  // Enabling creates the code instantly and leaves it inactive: no times are set yet
  if (action === "disable") await updateQr(kind, e.id, { qrToken: null, qrActivatesAt: null, qrExpiresAt: null });
  else await updateQr(kind, e.id, { qrToken: makeToken(kind) });

  await audit(actor.id, `QR_${action.toUpperCase()}`, "QrCode", e.id, { kind, title: e.title });
  return Response.json({ ok: true });
});
