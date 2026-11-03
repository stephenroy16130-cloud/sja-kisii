import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { canVerifyFor, canViewQr, EVENT_TYPE, loadEvent, type QrKind } from "@/lib/qr";
import CheckinReview from "./checkin-review";

// Scans waiting for a leader to confirm. Each leader sees only the people they may verify.
export default async function PendingCheckins({ kind, id }: { kind: QrKind; id: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const e = await loadEvent(kind, { id });
  if (!e || !canViewQr(user, e)) return null;

  const rows = await db.checkIn.findMany({
    where: { kind: EVENT_TYPE[kind], eventId: id },
    orderBy: { scannedAt: "asc" },
    include: { user: { select: { fullName: true } } },
  });
  const mine = rows.filter((r) => canVerifyFor(user, e, r.crewId));
  if (mine.length === 0) return null;

  const pending = mine.filter((r) => r.status === "PENDING");
  const confirmed = mine.filter((r) => r.status === "CONFIRMED").length;
  const rejected = mine.filter((r) => r.status === "REJECTED").length;

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">QR scans</p>
      <h2 className="mt-1 text-xl font-light">Pending verification ({pending.length})</h2>
      <p className="mb-4 mt-1 text-xs text-white/40">
        <span className="text-ok">{confirmed}</span> confirmed · <span className="text-bad">{rejected}</span> not accepted.
        Confirm only the people you can see are here.
      </p>
      {pending.length === 0 ? (
        <p className="text-sm text-white/50">Nothing waiting. All scans are decided.</p>
      ) : (
        <CheckinReview
          kind={kind}
          eventId={id}
          rows={pending.map((r) => ({
            userId: r.userId,
            name: r.user.fullName,
            crew: crewName(r.crewId),
            at: fmt(r.scannedAt),
          }))}
        />
      )}
    </section>
  );
}
