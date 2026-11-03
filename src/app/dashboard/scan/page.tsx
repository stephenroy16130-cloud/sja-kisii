import type { CheckInStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import QrScanner from "@/components/qr-scanner";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { titlesFor } from "@/lib/qr";

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

export default async function ScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db.checkIn.findMany({ where: { userId: user.id }, orderBy: { scannedAt: "desc" }, take: 15 });
  const titles = await titlesFor(rows.map((r) => ({ kind: r.kind, eventId: r.eventId })));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Check in</h1>
        <p className="mt-1 text-sm text-white/50">
          Scan the QR code shown at the meeting, field operation or training. A leader then confirms your attendance.
        </p>
      </div>

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
                    <p className="mt-1 text-xs text-white/40">Scanned {fmt(r.scannedAt)}</p>
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
