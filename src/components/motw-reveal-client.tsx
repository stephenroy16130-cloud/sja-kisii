"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import Avatar from "@/components/avatar";
import { api } from "@/lib/client";

type Phase = "suspense" | "flipping" | "revealed";
type Props = {
  resultId: string;
  name: string;
  photo: string | null;
  crew: string;
  color: string;
  week: string;
};

const SIZE = { width: "min(78vw, 18rem)", height: "min(112vw, 26rem)" };

function Trophy({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5c0 3 1.2 4.6 3.2 5M16 6h3c0 3-1.2 4.6-3.2 5" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  );
}

async function confettiBurst() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const colors = ["#d4af5a", "#ffffff", "#f1d98f"];
    const base = { colors, disableForReducedMotion: true };
    confetti({ ...base, particleCount: 130, spread: 100, startVelocity: 45, origin: { y: 0.55 } });
    const end = Date.now() + 2400;
    const frame = () => {
      confetti({ ...base, particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
      confetti({ ...base, particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  } catch {
    // no confetti is fine: the reveal still works
  }
}

export default function MotwRevealClient({ resultId, name, photo, crew, color, week }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [phase, setPhase] = useState<Phase>("suspense");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Closing the tab after the card has been seen still counts as seen
  useEffect(() => {
    if (phase !== "revealed") return;
    const send = () => {
      navigator.sendBeacon?.("/api/me/motw-reveal", new Blob([JSON.stringify({ resultId })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", send);
    return () => window.removeEventListener("pagehide", send);
  }, [phase, resultId]);

  function reveal() {
    if (phase !== "suspense") return;
    setPhase("flipping");
    navigator.vibrate?.([40, 60, 40]);
    setTimeout(() => void confettiBurst(), 550);
    setTimeout(() => setPhase("revealed"), 1000);
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      reveal();
    }
  }

  async function close() {
    setBusy(true);
    try {
      await api("/api/me/motw-reveal", "POST", { resultId });
    } catch {
      // if the network fails, it simply shows again next time
    }
    document.body.style.overflow = "";
    setOpen(false);
    setTimeout(() => document.getElementById("hall-of-fame")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    router.refresh();
  }

  if (!open) return null;
  const flipped = phase !== "suspense";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Member of the Week reveal"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black px-6"
    >
      <div className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Week of {week}</p>
        <h2 className="mt-3 text-2xl font-light md:text-3xl">
          {phase === "revealed" ? "Congratulations!" : "The Member of the Week is..."}
        </h2>
        <p className="font-copy mt-2 h-5 text-sm italic text-white/60">
          {phase === "suspense" ? "Tap to reveal!" : phase === "revealed" ? "You are the Member of the Week." : ""}
        </p>
      </div>

      <div className={phase === "suspense" ? "reveal-float" : ""}>
        <div
          role="button"
          tabIndex={0}
          aria-label={phase === "suspense" ? "Tap to reveal the Member of the Week" : "Member of the Week"}
          onClick={reveal}
          onKeyDown={onKey}
          className={`reveal-scene rounded-3xl outline-none ${phase === "suspense" ? "reveal-glow cursor-pointer" : ""}`}
          style={SIZE}
        >
          <div className={`reveal-card h-full w-full ${flipped ? "flipped" : ""}`}>
            {/* Front: the mystery card */}
            <div className="reveal-face flex flex-col items-center justify-center rounded-3xl border-2 border-gold bg-black text-gold">
              <div className="pointer-events-none absolute inset-3 rounded-2xl border border-gold/30" />
              <p className="text-[10px] uppercase tracking-[0.35em] text-gold/80">St. John Ambulance</p>
              <div className="my-8">
                <Trophy size={104} />
              </div>
              <p className="text-sm uppercase tracking-[0.3em]">Member of the Week</p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/40">Kisii University</p>
            </div>

            {/* Back: the winner */}
            <div className="reveal-face reveal-back flex flex-col items-center justify-center rounded-3xl border-2 border-gold bg-card px-5 text-center">
              <div className="rounded-full p-1" style={{ border: `3px solid ${color}` }}>
                <Avatar name={name} src={photo} size={112} />
              </div>
              <p className="mt-5 text-2xl uppercase leading-tight tracking-wide">{name}</p>
              {crew && (
                <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {crew}
                </p>
              )}
              <div className="mt-6 flex items-center gap-2 text-gold">
                <Trophy size={20} />
                <span className="text-[11px] uppercase tracking-[0.25em]">Member of the Week</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 h-12">
        {phase === "revealed" && (
          <button
            onClick={close}
            disabled={busy}
            className="rounded-full bg-white px-7 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? "One moment..." : "View on Hall of Fame"}
          </button>
        )}
      </div>
    </div>
  );
}
