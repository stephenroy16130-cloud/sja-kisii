"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls } from "@/lib/ui";

type Target =
  | { kind: "order"; orderId: string }
  | { kind: "announcement"; announcementId: string }
  | { kind: "registration" };

type Phase = "idle" | "form" | "waiting" | "paid" | "failed";

export default function PayButton({ target, amount, phone }: { target: Target; amount: string; phone: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [num, setNum] = useState(phone);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);

  useEffect(() => {
    return () => {
      stop.current = true;
    };
  }, []);

  async function poll(id: string) {
    const began = Date.now();
    let n = 0;
    stop.current = false;
    while (!stop.current && Date.now() - began < 120_000) {
      await new Promise((r) => setTimeout(r, 3000));
      if (stop.current) return;
      n++;
      // After 20 seconds, also ask Daraja directly every third check, in case the callback is late
      const verify = Date.now() - began > 20_000 && n % 3 === 0;
      try {
        const s = await fetch(`/api/mpesa/status/${id}${verify ? "?verify=1" : ""}`).then((r) => r.json());
        if (s.status === "SUCCESS") {
          setPhase("paid");
          router.refresh();
          return;
        }
        if (s.status === "FAILED" || s.status === "CANCELLED") {
          setPhase("failed");
          setMsg(s.message || (s.status === "CANCELLED" ? "You cancelled the payment." : "The payment did not go through."));
          return;
        }
      } catch {
        // keep waiting; a dropped request should not stop the check
      }
    }
    if (!stop.current) {
      setPhase("failed");
      setMsg("No confirmation yet. If M-Pesa took your money, wait a minute and refresh, or tell DO Finance.");
    }
  }

  async function start() {
    setBusy(true);
    setMsg("");
    try {
      const r = await api("/api/mpesa/stk", "POST", { ...target, phone: num });
      setPhase("waiting");
      setMsg(r.message);
      void poll(r.id);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  const green =
    "rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-50";

  if (phase === "paid") {
    return <span className="rounded-full border border-ok/50 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-ok">Payment received</span>;
  }

  if (phase === "waiting") {
    return (
      <div className="max-w-xs text-sm">
        <p className="text-gold">Waiting for your payment...</p>
        <p className="mt-1 text-xs text-white/50">{msg || "Check your phone and enter your M-Pesa PIN."}</p>
      </div>
    );
  }

  if (phase === "form") {
    return (
      <div className="w-full max-w-sm space-y-2">
        <label className="block text-[11px] uppercase tracking-[0.15em] text-white/50">M-Pesa number to charge</label>
        <input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          inputMode="tel"
          placeholder="0712345678"
          className={`${inputCls} !py-2.5`}
        />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || num.trim().length < 9} onClick={start} className={green}>
            {busy ? "Sending..." : `Send prompt · ${amount}`}
          </button>
          <button disabled={busy} onClick={() => setPhase("idle")} className={btnGhostCls}>
            Cancel
          </button>
        </div>
        {msg && <p className="text-xs text-bad">{msg}</p>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setPhase("form")} className={green}>
        {phase === "failed" ? "Try again" : `Pay ${amount} with M-Pesa`}
      </button>
      {phase === "failed" && msg && <p className="mt-2 max-w-xs text-xs text-bad">{msg}</p>}
    </div>
  );
}
