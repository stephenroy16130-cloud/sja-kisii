"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/client";
import { Badge } from "@/components/badge";
import { SocialPhoto } from "@/lib/profile";
import confetti from "canvas-confetti";

/**
 * Full‑screen MOTW reveal modal. Shows three UI states:
 *   1️⃣ Suspense – pulsing gold card, tap to start.
 *   2️⃣ Flip – 3D card flip with confetti.
 *   3️⃣ Reveal – winner's profile + congratulatory text.
 */
export default function MotwRevealModal({
  winner,
}: {
  winner: {
    id: string;
    fullName: string;
    photo: string | null;
    crewName: string | null;
  };
}) {
  const [stage, setStage] = useState<"suspend" | "flip" | "reveal">(
    "suspend"
  );

  // Confetti fires once when entering the flip stage
  useEffect(() => {
    if (stage === "flip") {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [stage]);

  // Persist the flag and close the modal
  const handleClose = async () => {
    await api("/api/motw/reveal", "POST");
    // parent component will stop rendering the modal after the request resolves
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* ------------ Stage 1 – Suspense ------------ */}
      {stage === "suspend" && (
        <div
          className="flex flex-col items-center gap-6 cursor-pointer"
          onClick={() => setStage("flip")}
        >
          <div className="sja-pulse rounded-full bg-gold/20 p-12">
            <Badge size={96} />
          </div>
          <p className="text-xl text-white">
            The Member of the Week is… Tap to reveal!
          </p>
        </div>
      )}

      {/* ------------ Stage 2 – Flip Animation ------------ */}
      {stage === "flip" && (
        <div
          className="relative w-80 h-96 perspective-1000 cursor-pointer"
          onClick={() => setStage("reveal")}
        >
          <div
            className="absolute inset-0 transition-transform duration-700 transform-style-preserve-3d"
            style={{
              transform: stage === "flip" ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front – gold card */}
            <div className="absolute inset-0 flex items-center justify-center bg-gold rounded-3xl backface-hidden">
              <Badge size={96} />
            </div>
            {/* Back – hidden (will become the reveal) */}
            <div className="absolute inset-0 bg-black rounded-3xl backface-hidden rotate-y-180" />
          </div>
          <p className="mt-4 text-center text-white">Tap again to see the winner</p>
        </div>
      )}

      {/* ------------ Stage 3 – Reveal ------------ */}
      {stage === "reveal" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full overflow-hidden border-4 border-gold">
            <SocialPhoto src={winner.photo} size={120} alt={winner.fullName} />
          </div>
          <h2 className="text-2xl font-light text-white">{winner.fullName}</h2>
          {winner.crewName && (
            <p className="text-lg text-white/70">{winner.crewName}</p>
          )}
          <p className="text-white/80">
            🎉 Congratulations! You are the Member of the Week! 🎉
          </p>
          <button
            onClick={handleClose}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            View on Hall of Fame
          </button>
        </div>
      )}
    </div>
  );
}

