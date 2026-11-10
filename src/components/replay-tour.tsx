"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function ReplayTour({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("hasSeen") && k.endsWith(`:${userId}`))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    try {
      await api("/api/me/onboarding", "POST", { completed: false });
    } catch {
      // ignore
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">App tour</p>
      <p className="mt-2 text-sm text-white/60">Show the welcome tour and the page tips again.</p>
      <button
        disabled={busy}
        onClick={go}
        className="mt-4 rounded-full border border-white/40 px-5 py-2.5 text-xs transition hover:bg-white hover:text-black disabled:opacity-50"
      >
        {busy ? "Starting..." : "Replay tour"}
      </button>
    </section>
  );
}
