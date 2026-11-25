"use client";

import { useEffect, useState } from "react";

const hourNow = () =>
  Number(new Intl.DateTimeFormat("en-KE", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(new Date()));
const greeting = () => {
  const h = hourNow();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// A friendly wave, once per visit, after any tour or pop-up has gone
export default function WaveGreeting({ userId, fullName, enabled }: { userId: string; fullName: string; enabled: boolean }) {
  const [show, setShow] = useState(false);
  const first = (fullName.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) || "there";

  useEffect(() => {
    if (!enabled) return;
    const key = `sja-wave:${userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // ignore
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (!document.querySelector('[role="dialog"]')) {
        clearInterval(timer);
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          // ignore
        }
        setShow(true);
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [enabled, userId]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 5200);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <button
        onClick={() => setShow(false)}
        className="wave-card pointer-events-auto flex items-center gap-3 rounded-full border border-gold/60 bg-card px-5 py-3 shadow-2xl shadow-black/60"
      >
        <span className="wave-hand text-2xl" aria-hidden="true">👋</span>
        <span className="text-left">
          <span className="block text-sm font-medium">
            {greeting()}, {first}!
          </span>
          <span className="block text-xs text-white/60">Welcome back to SJA Kisii.</span>
        </span>
      </button>
    </div>
  );
}
