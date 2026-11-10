"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { triggerRewardToast } from "@/components/reward-toast";

type View =
  | { phase: "working" }
  | { phase: "ok"; status: string; message?: string; toast?: string }
  | { phase: "error"; message: string };

export default function CheckInRunner({ token }: { token: string }) {
  const [view, setView] = useState<View>({ phase: "working" });
  const started = useRef(false);

  async function run() {
    setView({ phase: "working" });
    try {
      const r = await api("/api/checkin", "POST", { token });
      const toastMsg = r.toast || r.rewardToast;
      if (toastMsg) {
        try {
          sessionStorage.setItem("sja_first_reward_toast", toastMsg);
        } catch {
          // ignore
        }
        triggerRewardToast(toastMsg);
      }
      setView({ phase: "ok", status: r.status, message: r.message, toast: toastMsg });
    } catch (e) {
      setView({ phase: "error", message: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view.phase === "working") return <p className="mt-8 text-sm text-white/60">Checking you in...</p>;

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
      
      {view.toast && (
        <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-gold/60 bg-gold/10 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Achievement Unlocked · +10 PTS</p>
          <p className="mt-1 text-sm font-medium text-white">{view.toast}</p>
        </div>
      )}

      <p className="mt-3 text-sm text-white/60">
        {view.message ?? (confirmed ? "Your attendance is confirmed." : "Pending verification. A leader will confirm it shortly.")}
      </p>
      <Link href="/dashboard/scan" className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black">
        Done
      </Link>
    </div>
  );
}
