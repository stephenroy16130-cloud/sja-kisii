import type { CheckInStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import GeoCheckin from "@/components/geo-checkin";
import QrScanner from "@/components/qr-scanner";
import { getCurrentUser } from "@/lib/auth";
import { inBand } from "@/lib/band";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { EVENT_TYPE, KIND_LABEL, titlesFor, type QrKind } from "@/lib/qr";

export const dynamic = "force-dynamic";

const tone: Record<CheckInStatus, string> = {
  PENDING: "border-warn/50 text-warn",
  CONFIRMED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
};
const word: Record<CheckInStatus, string> = {
  PENDING: "Pending verification",
  CONFIRMED: "Confirmed",
  REJECTED: "Not accepted",
};

type Open = { kind: QrKind; id: string; title: string; at: Date; geo: boolean };

export default async function ScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const win = { qrToken: { not: null }, qrActivatesAt: { lte: now }, qrExpiresAt: { gt: now }, archivedAt: null };
  const crewId = user.crewId;

  const [rows, meetings, ops, trainings, mine] = await Promise.all([
    db.checkIn.findMany({ where: { userId: user.id }, orderBy: { scannedAt: "desc" }, take: 15 }),
    crewId
      ? db.meeting.findMany({ where: win, select: { id: true, title: true, startsAt: true, geoLat: true } })
      : Promise.resolve([]),
    crewId
      ? db.fieldOp.findMany({
          where: { ...win, OR: [{ allCrews: true }, { crews: { some: { id: crewId } } }] },
          select: { id: true, title: true, startsAt: true, geoLat: true },
        })
      : Promise.resolve([]),
    crewId
      ? db.training.findMany({
          where: {
            ...win,
            status: { not: "REJECTED" },
            ...(inBand(user) ? {} : { type: { not: "BAND" } }),
            OR: [{ crewId: null }, { crewId }],
          },
          select: { id: true, title: true, heldAt: true, geoLat: true },
        })
      : Promise.resolve([]),
    db.checkIn.findMany({ where: { userId: user.id }, select: { kind: true, eventId: true } }),
  ]);

  const done = new Set(mine.map((m) => `${m.kind}:${m.eventId}`));
  const open: Open[] = [
    ...meetings.map((m) => ({ kind: "meeting" as const, id: m.id, title: m.title, at: m.startsAt, geo: m.geoLat !== null })),
    ...ops.map((m) => ({ kind: "fieldop" as const, id: m.id, title: m.title, at: m.startsAt, geo: m.geoLat !== null })),
    ...trainings.map((m) => ({ kind: "training" as const, id: m.id, title: m.title, at: m.heldAt, geo: m.geoLat !== null })),
  ].filter((o) => !done.has(`${EVENT_TYPE[o.kind]}:${o.id}`));

  const titles = await titlesFor(rows.map((r) => ({ kind: r.kind, eventId: r.eventId })));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Check in</h1>
        <p className="mt-1 text-sm text-white/50">
          Check in when something is open, or scan the QR code at the venue. A leader then confirms your attendance.
        </p>
      </div>

      {!crewId && (
        <div className="rounded-2xl border border-warn/40 bg-card p-5 text-sm text-warn">
          You are not assigned to a crew yet, so you cannot check in. Ask your leaders to place you in a crew.
        </div>
      )}

      {open.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Open for check-in now</h2>
          <div className="space-y-3">
            {open.map((o) => (
              <div key={`${o.kind}-${o.id}`} className="rounded-2xl border border-ok/30 bg-card p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-ok">{KIND_LABEL[o.kind]}</p>
                <p className="mt-1 text-lg font-light">{o.title}</p>
                <p className="mt-1 text-sm text-white/60">{fmt(o.at)}</p>
                <div className="mt-4">
                  {o.geo ? (
                    <GeoCheckin kind={o.kind} id={o.id} />
                  ) : (
                    <p className="text-sm text-white/50">Scan the QR code at the venue to check in.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <QrScanner />

      <section>
        <h2 className="mb-4 text-xl font-light">My check-ins</h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">Nothing scanned yet.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const t = titles.get(`${r.kind}:${r.eventId}`);
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card p-5">
                  <div>
                    <p className="font-light">{t?.title ?? "Event"}</p>
                    <p className="mt-1 text-xs text-white/40">Checked in {fmt(r.scannedAt)}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${tone[r.status]}`}>
                    {word[r.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
