import { EMERGENCY } from "@/lib/contact";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { BADGE_SRC } from "@/lib/brand";
import { HttpError, route } from "@/lib/http";
import { fmt } from "@/lib/meetings";
import { canViewQr, KIND_LABEL, loadEvent, QR_KINDS, siteOrigin } from "@/lib/qr";

const W = 1240;
const H = 1754;
const MUTED = "#737373";

async function badgeData(origin: string): Promise<string | null> {
  try {
    const r = await fetch(`${origin}${BADGE_SRC}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export const GET = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(QR_KINDS).parse(p.kind);

  const e = await loadEvent(kind, { id: p.id });
  if (!e || !canViewQr(actor, e)) throw new HttpError(404, "Not found");
  if (!e.qrToken) throw new HttpError(404, "QR check-in is not turned on");

  const origin = await siteOrigin();
  const [qr, badge] = await Promise.all([
    QRCode.toDataURL(`${origin}/checkin/${e.qrToken}`, { width: 900, margin: 1, errorCorrectionLevel: "M" }),
    badgeData(origin),
  ]);

  const slug = e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  const download = new URL(req.url).searchParams.get("download") === "1";
  const windowText =
    e.qrActivatesAt && e.qrExpiresAt
      ? `Check-in opens ${fmt(e.qrActivatesAt)} and closes ${fmt(e.qrExpiresAt)}`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#ffffff",
          color: "#0a0a0a",
          padding: "80px 90px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 150,
            height: 150,
            borderRadius: 75,
            background: "#ffffff",
            border: "4px solid #0a0a0a",
          }}
        >
          {badge ? <img src={badge} width={112} height={112} /> : null}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 24, letterSpacing: 6, color: MUTED }}>
          ST. JOHN AMBULANCE · KISII UNIVERSITY
        </div>
        <div style={{ display: "flex", marginTop: 50, fontSize: 80 }}>Scan to check in</div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 22,
            maxWidth: 1000,
            fontSize: 50,
            textAlign: "center",
          }}
        >
          {e.title}
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: MUTED }}>
          {`${KIND_LABEL[kind]} · ${fmt(e.startsAt)}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            padding: 26,
            border: "4px solid #0a0a0a",
            borderRadius: 28,
          }}
        >
          <img src={qr} width={640} height={640} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 40,
            maxWidth: 940,
            fontSize: 28,
            lineHeight: 1.5,
            textAlign: "center",
            color: "#404040",
          }}
        >
          Open the SJA Kisii app and tap Check in, or point your phone camera at this code. You must be signed in. A
          leader will confirm your attendance.
        </div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 24, color: MUTED }}>
          {`St. John Ambulance emergency line: ${EMERGENCY.display}`}
        </div>
        {windowText ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 22, fontSize: 26, color: MUTED }}>
            {windowText}
          </div>
        ) : null}
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "private, no-store",
        ...(download ? { "Content-Disposition": `attachment; filename="poster-${slug}.png"` } : {}),
      },
    }
  );
});
