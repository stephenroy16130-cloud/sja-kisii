import { getCurrentUser } from "@/lib/auth";
import { fmt } from "@/lib/meetings";
import { canManageQr, canViewQr, loadEvent, siteOrigin, windowState, type QrKind } from "@/lib/qr";
import QrControls from "./qr-controls";

// Shown on an event page to whoever may download, print or schedule its QR code
export default async function QrPanel({ kind, id }: { kind: QrKind; id: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const e = await loadEvent(kind, { id });
  if (!e || !canViewQr(user, e)) return null;
  const manage = canManageQr(user, e);
  if (!e.qrToken && !manage) return null;

  const state = windowState(e);
  const text =
    state === "OFF" ? ""
    : state === "NOT_SET" ? "Inactive · times not set"
    : state === "EARLY" ? `Inactive · opens ${fmt(e.qrActivatesAt as Date)}`
    : state === "OPEN" ? `Open now · closes ${fmt(e.qrExpiresAt as Date)}`
    : `Closed · expired ${fmt(e.qrExpiresAt as Date)}`;
  const devLink = process.env.NODE_ENV !== "production" && e.qrToken ? `${await siteOrigin()}/checkin/${e.qrToken}` : null;

  return (
    <QrControls
      kind={kind}
      id={e.id}
      startsAt={e.startsAt.toISOString()}
      hasQr={Boolean(e.qrToken)}
      version={e.qrToken ? e.qrToken.slice(-6) : ""}
      activatesAt={e.qrActivatesAt ? e.qrActivatesAt.toISOString() : null}
      expiresAt={e.qrExpiresAt ? e.qrExpiresAt.toISOString() : null}
      state={state}
      stateText={text}
      manage={manage}
      devLink={devLink}
      geo={e.geo}
    />
  );
}
