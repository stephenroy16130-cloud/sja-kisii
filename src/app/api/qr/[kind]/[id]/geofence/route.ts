import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { GEO_MAX_RADIUS, GEO_MIN_RADIUS } from "@/lib/geo";
import { HttpError, route } from "@/lib/http";
import { canManageQr, loadEvent, QR_KINDS, updateQr } from "@/lib/qr";

const schema = z.object({
  geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radius: z.number().int().min(GEO_MIN_RADIUS, `Use at least ${GEO_MIN_RADIUS} metres`).max(GEO_MAX_RADIUS, `Use at most ${GEO_MAX_RADIUS} metres`),
    })
    .nullable(),
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);
  const { geo } = schema.parse(await req.json());

  const e = await loadEvent(kind, { id: p.id });
  if (!e) throw new HttpError(404, "Event not found");
  if (!canManageQr(actor, e)) throw new HttpError(403, "You do not have permission to change this");
  if (!e.qrToken) throw new HttpError(409, "Turn on QR check-in first");

  await updateQr(kind, e.id, geo ? { geoLat: geo.lat, geoLng: geo.lng, geoRadius: geo.radius } : { geoLat: null, geoLng: null, geoRadius: null });
  await audit(actor.id, geo ? "QR_GEOFENCE_SET" : "QR_GEOFENCE_CLEARED", "QrCode", e.id, { kind, radius: geo?.radius ?? null });
  return Response.json({ ok: true });
});
