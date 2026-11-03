import QRCode from "qrcode";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { canViewQr, loadEvent, QR_KINDS, siteOrigin } from "@/lib/qr";

export const GET = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);

  const e = await loadEvent(kind, { id: p.id });
  if (!e || !canViewQr(actor, e)) throw new HttpError(404, "Not found");
  if (!e.qrToken) throw new HttpError(404, "QR check-in is not turned on");

  const url = `${await siteOrigin()}/checkin/${e.qrToken}`;
  const q = new URL(req.url).searchParams;
  const png = q.get("format") === "png";
  const slug = e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  const headers: Record<string, string> = {
    "Content-Type": png ? "image/png" : "image/svg+xml",
    "Cache-Control": "private, no-store",
    ...(q.get("download") === "1" ? { "Content-Disposition": `attachment; filename="qr-${slug}.${png ? "png" : "svg"}"` } : {}),
  };

  if (png) {
    const buf = await QRCode.toBuffer(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
    return new Response(new Blob([new Uint8Array(buf)], { type: "image/png" }), { headers });
  }
  const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
  return new Response(svg, { headers });
});
