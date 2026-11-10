"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; title: string; body?: string };
const EVENT = "sja-toast";

// Call this from anywhere on the page to pop a message at the top of the screen
export function showToast(title: string, body?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { title, body } }));
}

// The reward for a member's very first check-in
export function announceFirstCheckIn(r: { first?: boolean; points?: number; band?: boolean }) {
  if (!r.first) return;
  const n = r.points ?? 10;
  showToast(
    "🎉 First Check-In Successful!",
    r.band
      ? `You earned ${n} band points. A leader will confirm it shortly.`
      : `You earned ${n} points toward Member of the Week. A leader will confirm it shortly.`
  );
}

export default function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { title: string; body?: string };
      const id = ++n;
      setItems((c) => [...c, { id, title: d.title, body: d.body }]);
      setTimeout(() => setItems((c) => c.filter((x) => x.id !== id)), 8000);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => setItems((c) => c.filter((x) => x.id !== t.id))}
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-gold/60 bg-card px-5 py-4 text-left shadow-2xl"
        >
          <p className="text-sm font-medium">{t.title}</p>
          {t.body && <p className="mt-1 text-xs leading-relaxed text-white/70">{t.body}</p>}
        </button>
      ))}
    </div>
  );
}
