"use client";

import { useEffect, useState } from "react";

export const REWARD_TOAST_EVENT = "sja:reward-toast";

export function triggerRewardToast(message?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(REWARD_TOAST_EVENT, {
        detail: {
          message:
            message ||
            "🎉 First Check-In Successful! You earned 10 points toward Member of the Week.",
        },
      })
    );
  }
}

export default function RewardToast() {
  const [toast, setToast] = useState<{ message: string } | null>(null);

  useEffect(() => {
    // 1. Check if there is a pending reward toast in sessionStorage
    try {
      const stored = sessionStorage.getItem("sja_first_reward_toast");
      if (stored) {
        sessionStorage.removeItem("sja_first_reward_toast");
        setToast({ message: stored });
      }
    } catch {
      // ignore
    }

    // 2. Listen for custom event
    function handleEvent(e: Event) {
      const custom = e as CustomEvent<{ message?: string }>;
      setToast({
        message:
          custom.detail?.message ||
          "🎉 First Check-In Successful! You earned 10 points toward Member of the Week.",
      });
    }

    window.addEventListener(REWARD_TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(REWARD_TOAST_EVENT, handleEvent);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="fixed left-1/2 top-5 z-[100] w-full max-w-md -translate-x-1/2 px-4 transition-all duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-gold/90 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-4 shadow-2xl shadow-gold/30 backdrop-blur-xl sm:p-5 animate-in slide-in-from-top-4 duration-300">
        {/* Shimmer light sweep across banner */}
        <div className="pointer-events-none absolute -inset-y-full -left-20 w-32 rotate-12 bg-white/10 blur-xl animate-[sja-slide_2.5s_infinite]" />

        <div className="flex items-start gap-3.5">
          {/* Trophy Badge */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/50 bg-gold/15 text-2xl shadow-md shadow-gold/20">
            🏆
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                <span className="inline-block h-2 w-2 rounded-full bg-gold animate-ping" />
                Achievement Unlocked
              </span>
              <span className="rounded-full border border-gold/60 bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-gold">
                +10 PTS
              </span>
            </div>

            <p className="mt-1 text-sm font-medium leading-snug text-white">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss notification"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

