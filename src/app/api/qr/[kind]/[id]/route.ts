import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { notifyCrewLeaders } from "@/lib/push";
import { canManageQr, KIND_LABEL, loadEvent, makeToken, QR_KINDS, updateQr } from "@/lib/qr";

const schema = z.object({ action: z.enum(["enable", "disable", "regenerate", "share"]) });

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

  let notifiedCount = 0;

  // Enabling creates the code instantly and leaves it inactive: no times are set yet
  if (action === "disable") {
    await updateQr(kind, e.id, { qrToken: null, qrActivatesAt: null, qrExpiresAt: null, geoLat: null, geoLng: null, geoRadius: null });
  } else if (action === "enable") {
    const token = makeToken(kind);
    await updateQr(kind, e.id, { qrToken: token });
    // Notify Sergeants and Corporals that QR check-in is enabled
    notifiedCount = await notifyCrewLeaders(
      e.crewIds,
      {
        title: `QR Check-in: ${e.title}`,
        body: `Check-in QR code for ${KIND_LABEL[kind].toLowerCase()} "${e.title}" is ready. Tap to view or print the QR code.`,
        url: `/qr/${kind}/${e.id}`,
      },
      actor.id
    );
  } else if (action === "regenerate") {
    const token = makeToken(kind);
    await updateQr(kind, e.id, { qrToken: token });
    // When renewed, automatically notify Sergeants and Corporals with the updated QR code
    notifiedCount = await notifyCrewLeaders(
      e.crewIds,
      {
        title: `Renewed QR Code: ${e.title}`,
        body: `A new check-in QR code has been generated for "${e.title}". The old code has expired. Tap to view or print the new QR code.`,
        url: `/qr/${kind}/${e.id}`,
      },
      actor.id
    );
  } else if (action === "share") {
    // Explicitly share/re-notify Sergeants and Corporals
    notifiedCount = await notifyCrewLeaders(
      e.crewIds,
      {
        title: `Check-in QR Poster: ${e.title}`,
        body: `The check-in QR code for "${e.title}" was shared with you. Tap to view or print.`,
        url: `/qr/${kind}/${e.id}`,
      },
      actor.id
    );
  }

  await audit(actor.id, `QR_${action.toUpperCase()}`, "QrCode", e.id, { kind, title: e.title, notifiedCount });
  return Response.json({ ok: true, count: notifiedCount });
});
