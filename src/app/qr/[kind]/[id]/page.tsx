import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Badge from "@/components/badge";
import PrintButton from "@/components/print-button";
import { getCurrentUser } from "@/lib/auth";
import { fmt } from "@/lib/meetings";
import { canViewQr, KIND_LABEL, loadEvent, QR_KINDS, type QrKind } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function PosterPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const p = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/qr/${p.kind}/${p.id}`)}`);

  const kind = (QR_KINDS as readonly string[]).includes(p.kind) ? (p.kind as QrKind) : null;
  const e = kind ? await loadEvent(kind, { id: p.id }) : null;
  if (!kind || !e || !canViewQr(user, e)) notFound();

  const base = `/api/qr/${kind}/${e.id}/image`;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <PrintButton />
          <a href={`${base}?format=png&download=1`} className="rounded-full border border-black px-6 py-2.5 text-sm">Download PNG</a>
          <Link href={`/dashboard/${kind === "meeting" ? "meetings" : kind === "fieldop" ? "fieldops" : "training"}/${e.id}`} className="rounded-full border border-black px-6 py-2.5 text-sm">
            Back to event
          </Link>
        </div>

        {!e.qrToken ? (
          <p className="text-lg">QR check-in is not turned on for this event.</p>
        ) : (
          <div>
            <div className="flex justify-center">
              <Badge size={80} />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-neutral-500">St. John Ambulance · Kisii University</p>
            <h1 className="mt-6 text-4xl font-light tracking-tight">Scan to check in</h1>
            <p className="mt-3 text-xl">{e.title}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {KIND_LABEL[kind]} · {fmt(e.startsAt)}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${base}?format=svg&v=${e.qrToken.slice(-6)}`} alt="QR code" className="mx-auto mt-8 w-full max-w-md" />
            <p className="mt-6 text-sm leading-relaxed text-neutral-600">
              Open the SJA Kisii app and tap Check in, or point your phone camera at this code. You must be signed in.
              A leader will confirm your attendance.
            </p>
            {e.qrActivatesAt && e.qrExpiresAt && (
              <p className="mt-4 text-sm text-neutral-500">
                Check-in opens {fmt(e.qrActivatesAt)} and closes {fmt(e.qrExpiresAt)}.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
