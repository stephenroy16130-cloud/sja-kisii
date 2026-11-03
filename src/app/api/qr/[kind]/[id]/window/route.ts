import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { canManageQr, loadEvent, QR_KINDS, updateQr } from "@/lib/qr";

const schema = z
  .object({ activatesAt: z.string().datetime().nullable(), expiresAt: z.string().datetime().nullable() })
  .refine((d) => (d.activatesAt === null) === (d.expiresAt === null), {
    message: "Set both the activation and the expiry time, or clear both",
    path: ["expiresAt"],
  })
  .refine((d) => !d.activatesAt || !d.expiresAt || new Date(d.expiresAt) > new Date(d.activatesAt), {
    message: "The expiry time must be after the activation time",
    path: ["expiresAt"],
  });

export const PUT = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const d = schema.parse(await req.json());

  const e = await loadEvent(kind, { id: p.id });
  if (!e) throw new HttpError(404, "Event not found");
  if (!canManageQr(actor, e)) throw new HttpError(403, "You do not have permission to change this");
  if (!e.qrToken) throw new HttpError(409, "Turn on QR check-in first");

  await updateQr(kind, e.id, {
    qrActivatesAt: d.activatesAt ? new Date(d.activatesAt) : null,
    qrExpiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
  });
  await audit(actor.id, "QR_WINDOW_SET", "QrCode", e.id, { kind, activatesAt: d.activatesAt, expiresAt: d.expiresAt });
  return Response.json({ ok: true });
});
