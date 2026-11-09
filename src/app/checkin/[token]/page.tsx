import { redirect } from "next/navigation";
import Badge from "@/components/badge";
import EmergencyLine from "@/components/emergency-line";
import { getCurrentUser } from "@/lib/auth";
import { fmt } from "@/lib/meetings";
import { KIND_LABEL, kindOfToken, loadEvent } from "@/lib/qr";
import CheckInRunner from "./checkin-runner";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  // Not signed in: go to the login page, then come straight back here
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkin/${token}`)}`);

  const kind = kindOfToken(token);
  const e = kind ? await loadEvent(kind, { token }) : null;
  const valid = kind !== null && e !== null && e.qrToken === token;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <Badge size={72} />
        </div>
        {valid && kind && e ? (
          <>
            <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-gold">{KIND_LABEL[kind]} check-in</p>
            <h1 className="mt-2 text-2xl font-light tracking-tight">{e.title}</h1>
            <p className="mt-1 text-sm text-white/50">{fmt(e.startsAt)}</p>
            <CheckInRunner token={token} />
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-light">This code is not valid</h1>
            <p className="mt-2 text-sm text-white/60">It may have been replaced or turned off. Ask your leader for the current code.</p>
          </>
        )}
        <EmergencyLine className="mt-10" />
      </div>
    </main>
  );
}
