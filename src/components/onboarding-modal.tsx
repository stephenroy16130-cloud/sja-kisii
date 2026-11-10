"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

interface OnboardingModalProps {
  user: {
    firstName: string;
    crewName: string;
    hasCompletedOnboarding: boolean;
  };
}

export default function OnboardingModal({ user }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Touch gesture tracking for horizontal swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    // Only open if the user has not completed onboarding
    if (!user.hasCompletedOnboarding) {
      const localCompleted = localStorage.getItem("has_completed_onboarding");
      if (localCompleted !== "true") {
        setIsOpen(true);
      }
    }
  }, [user.hasCompletedOnboarding]);

  async function completeOnboarding() {
    setIsOpen(false);
    // Persist locally immediately to prevent any flicker
    localStorage.setItem("has_completed_onboarding", "true");
    setSubmitting(true);
    try {
      await api("/api/onboarding/complete", "POST");
    } catch {
      // Offline fallback: already stored in localStorage
    } finally {
      setSubmitting(false);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only swipe if horizontal movement is dominant and > 40px
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swiped left -> next
        if (currentSlide < 2) {
          setCurrentSlide((prev) => prev + 1);
        }
      } else {
        // Swiped right -> prev
        if (currentSlide > 0) {
          setCurrentSlide((prev) => prev - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  if (!isOpen) return null;

  const slides = [
    {
      id: "crew",
      tag: "CREW RECRUITMENT",
      title: "Welcome to the Team",
      text: `Welcome to St. John KSU, ${user.firstName || "Member"}! You have been assigned to ${user.crewName || "your Crew"}.`,
      icon: (
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-gold/20 [animation-duration:3s]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/30 via-neutral-900 to-black shadow-lg shadow-gold/20">
            <svg
              className="h-10 w-10 text-gold"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
      ),
      highlight: user.crewName,
    },
    {
      id: "attendance",
      tag: "TACTICAL CHECK-IN",
      title: "Attendance & Geofencing",
      text: "We track your attendance using Geofencing and QR Codes. When a meeting starts, simply open the app and click 'Check In'.",
      icon: (
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-ok/20 [animation-duration:3s]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-ok/40 bg-gradient-to-br from-ok/30 via-neutral-900 to-black shadow-lg shadow-ok/20">
            <svg
              className="h-10 w-10 text-ok"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
              {/* Radar pulse rings */}
              <circle cx="12" cy="10" r="6" strokeDasharray="2 3" opacity="0.6" />
            </svg>
          </div>
        </div>
      ),
      highlight: "Check In",
    },
    {
      id: "gamification",
      tag: "LEAGUE REWARDS",
      title: "Member of the Week",
      text: "Attend meetings to earn points and climb the leaderboard. Can you become the Member of the Week?",
      icon: (
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/25 [animation-duration:2.5s]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500/30 via-neutral-900 to-black shadow-lg shadow-amber-500/30">
            <svg
              className="h-10 w-10 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
              <path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" />
            </svg>
          </div>
        </div>
      ),
      highlight: "Member of the Week",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md transition-opacity duration-300 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="First-time user onboarding"
    >
      {/* Background ambient lighting - Mobile Game Stadium Aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-ok/10 blur-3xl" />
      </div>

      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-neutral-900/95 via-neutral-950/98 to-black p-6 shadow-2xl shadow-gold/20 backdrop-blur-xl sm:p-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Header: Game Progress Bar + Skip Button */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
                Tutorial · Step {currentSlide + 1} of 3
              </span>
            </div>
            {/* 3-segment progress bar */}
            <div className="mt-2 flex gap-1.5">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    idx === currentSlide
                      ? "bg-gold shadow-sm shadow-gold"
                      : idx < currentSlide
                        ? "bg-white/60"
                        : "bg-white/15"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Skip Button - Always visible in top right */}
          <button
            type="button"
            onClick={completeOnboarding}
            disabled={submitting}
            className="group flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/70 transition hover:border-gold hover:bg-gold/10 hover:text-gold"
          >
            <span>Skip</span>
            <svg
              className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Carousel Content Area */}
        <div className="relative min-h-[290px] overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((s) => (
              <div
                key={s.id}
                className="flex w-full shrink-0 flex-col items-center px-2 py-4 text-center"
              >
                {/* Hero Icon */}
                <div className="mb-5 flex justify-center">{s.icon}</div>

                {/* Tactical Tag */}
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                  {s.tag}
                </span>

                {/* Slide Title */}
                <h2 className="mt-3 text-2xl font-light tracking-tight text-white sm:text-3xl">
                  {s.title}
                </h2>

                {/* Slide Description */}
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Swipe hint for mobile users */}
        <p className="my-2 text-center text-[11px] uppercase tracking-[0.18em] text-white/30">
          Swipe or tap Next to continue
        </p>

        {/* Bottom Actions */}
        <div className="mt-4 flex items-center gap-3">
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
              className="rounded-full border border-white/25 px-5 py-3 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Back
            </button>
          )}

          {currentSlide < 2 ? (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => Math.min(2, prev + 1))}
              className="flex-1 rounded-full bg-gradient-to-r from-gold via-amber-300 to-yellow-500 py-3.5 text-center text-sm font-semibold tracking-wide text-black shadow-lg shadow-gold/20 transition hover:brightness-105 active:scale-[0.99]"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={completeOnboarding}
              disabled={submitting}
              className="flex-1 rounded-full bg-gradient-to-r from-ok via-emerald-400 to-teal-400 py-3.5 text-center text-sm font-semibold tracking-wide text-black shadow-lg shadow-ok/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? "Entering Mission..." : "Let's Go"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

