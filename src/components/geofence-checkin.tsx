"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { triggerRewardToast } from "@/components/reward-toast";

interface ActiveEvent {
  kind: "meeting" | "fieldop" | "training";
  id: string;
  title: string;
}

export default function GeofenceCheckin({ events }: { events: ActiveEvent[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(events[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (events.length === 0) return null;

  async function checkInWithGps() {
    setError("");
    setMsg("");

    const targetEvent = events.find((e) => e.id === selectedId) || events[0];
    if (!targetEvent) return;

    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await api("/api/checkin", "POST", {
            method: "geofence",
            kind: targetEvent.kind,
            eventId: targetEvent.id,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
          });

          const toastMsg = r.toast || r.rewardToast;
          if (toastMsg) {
            try {
              sessionStorage.setItem("sja_first_reward_toast", toastMsg);
            } catch {
              // ignore
            }
            triggerRewardToast(toastMsg);
          }

          setMsg(r.message || (r.status === "CONFIRMED" ? "Checked in successfully!" : "Check-in sent! Waiting for verification."));
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Geofence check-in failed.");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === 1
            ? "Location access was denied. Please enable GPS permissions in your browser."
            : "Could not retrieve your location. Try scanning the QR code instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-ok animate-pulse" />
            <h3 className="text-lg font-light">Geofence Check-In</h3>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Within range of the venue? Tap below to check in directly with GPS.
          </p>
        </div>
        <span className="rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ok">
          GPS Live
        </span>
      </div>

      {events.length > 1 && (
        <div className="mt-4">
          <label className="mb-1.5 block text-[11px] uppercase tracking-[0.15em] text-white/50">
            Select Active Event
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.kind})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          disabled={busy}
          onClick={checkInWithGps}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-ok/50 bg-ok/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-ok transition hover:bg-ok hover:text-black disabled:opacity-50"
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
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {busy ? "Acquiring GPS Signal..." : `Check In via GPS · ${events.find((e) => e.id === selectedId)?.title || events[0]?.title}`}
        </button>
      </div>

      {msg && <p className="mt-3 text-xs text-ok">{msg}</p>}
      {error && <p className="mt-3 text-xs text-warn">{error}</p>}
    </div>
  );
}

