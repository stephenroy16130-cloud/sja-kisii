"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { announceFirstCheckIn } from "@/components/toast";
import { api } from "@/lib/client";
import { getPosition, locationErrorMessage } from "@/lib/geo-client";

type View =
  | { phase: "working"; note: string }
  | { phase: "ok"; status: string; message?: string }
  | { phase: "error"; message: string };

export default function CheckInRunner({ token, geo }: { token: string; geo: boolean }) {
  const [view, setView] = useState<View>({ phase: "working", note: "Checking you in..." });
  const started = useRef(false);

  async function run() {
    setView({ phase: "working", note: geo ? "Getting your location..." : "Checking you in..." });
    try {
      let payload: Record<string, unknown> = { token };
      if (geo) {
        const p = await getPosition();
        payload = { token, lat: p.lat, lng: p.lng, accuracy: p.accuracy };
        setView({ phase: "working", note: "Checking you in..." });
      }
      const r = await api("/api/checkin", "POST", payload);
      announceFirstCheckIn(r);
      setView({ phase: "ok", status: r.status, message: r.message });
    } catch (e) {
      setView({ phase: "error", message: locationErrorMessage(e) });
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view.phase === "working") return <p className="mt-8 text-sm text-white/60">{view.note}</p>;

  if (view.phase === "error") {
    return (
      <div className="mt-8">
        <p className="text-lg text-warn">{view.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => void run()} className="rounded-full border border-white/30 px-5 py-2.5 text-xs transition hover:bg-white hover:text-black">
            Try again
          </button>
          <Link href="/dashboard" className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const confirmed = view.status === "CONFIRMED";
  return (
    <div className="mt-8">
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-3xl ${confirmed ? "border-ok text-ok" : "border-gold text-gold"}`}>
        ✓
      </div>
      <p className="mt-5 text-xl font-light">{confirmed ? "You are checked in" : "Check-in received"}</p>
      <p className="mt-2 text-sm text-white/60">
        {view.message ?? (confirmed ? "Your attendance is confirmed." : "Pending verification. A leader will confirm it shortly.")}
      </p>
      <Link href="/dashboard/scan" className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black">
        Done
      </Link>
    </div>
  );
}
