"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client";

const svg = {
  width: 96,
  height: 96,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function TeamIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <circle cx="5.5" cy="10" r="2" />
      <path d="M2 18c0-2 1.5-3.5 3.5-3.5" />
      <circle cx="18.5" cy="10" r="2" />
      <path d="M22 18c0-2-1.5-3.5-3.5-3.5" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg {...svg}>
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg {...svg}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5c0 3 1.2 4.6 3.2 5M16 6h3c0 3-1.2 4.6-3.2 5" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  );
}

export default function OnboardingModal({
  firstName,
  crewName,
  crewColor,
}: {
  firstName: string;
  crewName: string | null;
  crewColor: string;
}) {
  const router = useRouter();
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const slides: { icon: ReactNode; title: string; body: string; color: string; chip?: string | null }[] = [
    {
      icon: <TeamIcon />,
      color: crewColor,
      title: `Welcome to St. John KSU, ${firstName}!`,
      body: crewName ? "You have been assigned to" : "Your leaders will assign you to a crew soon.",
      chip: crewName,
    },
    {
      icon: <PinIcon />,
      color: "#d4af5a",
      title: "Check in with ease",
      body: "We track your attendance using Geofencing and QR Codes. When a meeting starts, simply open the app and click 'Check In'.",
    },
    {
      icon: <TrophyIcon />,
      color: "#d4af5a",
      title: "Earn points and shine",
      body: "Attend meetings to earn points and climb the leaderboard. Can you become the Member of the Week?",
    },
  ];
  const last = slides.length - 1;

  function onScroll() {
    const el = track.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  }
  function go(n: number) {
    const el = track.current;
    el?.scrollTo({ left: el.clientWidth * n, behavior: "smooth" });
  }

  // Skip and Let's Go both mark the tour as done, so it never shows again
  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await api("/api/me/onboarding", "POST", { completed: true });
    } catch {
      // if the network fails it simply shows again next time
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome tour" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4">
      <button
        onClick={finish}
        disabled={busy}
        className="absolute right-4 top-4 rounded-full border border-white/30 px-5 py-2 text-xs uppercase tracking-[0.15em] text-white/80 transition hover:bg-white hover:text-black"
      >
        Skip
      </button>

      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-card">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {slides.map((s) => (
            <div key={s.title} className="w-full shrink-0 snap-center px-8 pb-6 pt-12 text-center">
              <div className="flex justify-center" style={{ color: s.color }}>
                {s.icon}
              </div>
              <h2 className="mt-8 text-2xl font-light leading-snug">{s.title}</h2>
              <p className="font-copy mt-4 text-sm leading-relaxed text-white/70">{s.body}</p>
              {s.chip && (
                <span
                  className="mt-4 inline-block rounded-full px-5 py-2 text-xs font-medium uppercase tracking-[0.15em] text-black"
                  style={{ backgroundColor: s.color }}
                >
                  {s.chip}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="px-8 pb-8">
          <div className="mb-5 flex justify-center gap-2">
            {slides.map((s, n) => (
              <span key={s.title} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-gold" : "w-1.5 bg-white/25"}`} />
            ))}
          </div>
          <button
            onClick={() => (i >= last ? finish() : go(i + 1))}
            disabled={busy}
            className="w-full rounded-full bg-white px-5 py-3.5 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {i >= last ? "Let's Go" : "Next"}
          </button>
          <p className="mt-3 text-center text-[11px] text-white/30">Swipe to see the next step</p>
        </div>
      </div>
    </div>
  );
}
