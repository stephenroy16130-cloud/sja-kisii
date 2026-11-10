"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { getPosition, locationErrorMessage } from "@/lib/geo-client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

type State = "OFF" | "NOT_SET" | "EARLY" | "OPEN" | "CLOSED";
const TONE: Record<State, string> = {
  OFF: "",
  NOT_SET: "border-white/20 text-white/60",
  EARLY: "border-warn/50 text-warn",
  OPEN: "border-ok/50 text-ok",
  CLOSED: "border-bad/50 text-bad",
};

// An ISO time as the "yyyy-mm-ddThh:mm" text a date-time box wants, in the browser's own timezone
const local = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function QrControls({
  kind, id, startsAt, hasQr, version, activatesAt, expiresAt, state, stateText, manage, devLink, geo,
}: {
  kind: string;
  id: string;
  startsAt: string;
  hasQr: boolean;
  version: string;
  activatesAt: string | null;
  expiresAt: string | null;
  state: State;
  stateText: string;
  manage: boolean;
  devLink: string | null;
  geo: { lat: number; lng: number; radius: number } | null;
}) {
  const router = useRouter();
  const [a, setA] = useState(local(activatesAt));
  const [x, setX] = useState(local(expiresAt));
  const [coords, setCoords] = useState(geo ? `${geo.lat}, ${geo.lng}` : "");
  const [radius, setRadius] = useState(String(geo?.radius ?? 150));
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await fn();
      setMsg(ok);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  const base = `/api/qr/${kind}/${id}`;
  const act = (action: "enable" | "disable" | "regenerate", ok: string) => run(() => api(base, "PUT", { action }), ok);

  function saveTimes() {
    if (!a || !x) return setError("Choose both the activation and the expiry time.");
    void run(
      () => api(`${base}/window`, "PUT", { activatesAt: new Date(a).toISOString(), expiresAt: new Date(x).toISOString() }),
      "Times saved"
    );
  }
  function clearTimes() {
    setA("");
    setX("");
    void run(() => api(`${base}/window`, "PUT", { activatesAt: null, expiresAt: null }), "Times cleared. The code is inactive.");
  }
  function suggest() {
    const s = new Date(startsAt).getTime();
    setA(local(new Date(s - 15 * 60000).toISOString()));
    setX(local(new Date(s + 2 * 3600000).toISOString()));
  }

  async function useMyLocation() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const p = await getPosition();
      setCoords(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
      setAccuracy(Math.round(p.accuracy));
    } catch (e) {
      setError(locationErrorMessage(e));
    }
    setBusy(false);
  }
  function saveGeo() {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(coords);
    if (!m) return setError("Enter the venue as two numbers, like -0.6817, 34.7667, or tap Use my current location.");
    void run(
      () => api(`${base}/geofence`, "PUT", { geo: { lat: Number(m[1]), lng: Number(m[2]), radius: Number(radius) } }),
      "Location check saved"
    );
  }
  function clearGeo() {
    setCoords("");
    void run(() => api(`${base}/geofence`, "PUT", { geo: null }), "Location check removed");
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">QR check-in</p>
          <p className="mt-1 text-sm text-white/60">
            {hasQr
              ? "The code is created. Set when it opens and closes below."
              : "Turn this on to create a QR code members can scan. It is made instantly, and you set when it opens afterwards."}
          </p>
        </div>
        {hasQr && (
          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${TONE[state]}`}>
            {stateText}
          </span>
        )}
      </div>

      {!hasQr && manage && (
        <button
          disabled={busy}
          onClick={() => act("enable", "QR check-in is on")}
          className="mt-4 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Creating..." : "Enable QR code check-in"}
        </button>
      )}

      {hasQr && (
        <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${base}/image?format=svg&v=${version}`} alt="QR code" className="w-full rounded-2xl bg-white p-2" />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a href={`${base}/poster?download=1`} className={btnGhostCls}>Poster (PNG)</a>
              <a href={`${base}/image?format=svg&download=1`} className={btnGhostCls}>QR only (SVG)</a>
              <Link href={`/qr/${kind}/${id}`} target="_blank" className={btnGhostCls}>Print</Link>
            </div>
          </div>

          <div className="space-y-4">
            {manage ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Activation time</label>
                    <input type="datetime-local" value={a} onChange={(e) => setA(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Expiry time</label>
                    <input type="datetime-local" value={x} onChange={(e) => setX(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={saveTimes}
                    className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save times"}
                  </button>
                  <button disabled={busy} onClick={suggest} className={btnGhostCls}>Fill from event time</button>
                  {(activatesAt || expiresAt) && (
                    <button disabled={busy} onClick={clearTimes} className={btnGhostCls}>Clear</button>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Location check (optional)</p>
                  <p className="mt-1 text-xs text-white/50">
                    {geo
                      ? `Members must be within ${geo.radius} m of the venue to check in.`
                      : "Not set. Members can check in from anywhere. Set it to make check-in work only at the venue."}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                    <div>
                      <label className={labelCls}>Venue (latitude, longitude)</label>
                      <input
                        value={coords}
                        onChange={(e) => setCoords(e.target.value)}
                        placeholder="-0.6817, 34.7667"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Radius (m)</label>
                      <input
                        type="number"
                        min={30}
                        max={2000}
                        value={radius}
                        onChange={(e) => setRadius(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  {accuracy !== null && (
                    <p className="mt-2 text-xs text-white/40">
                      Location captured, accurate to about {accuracy} m. Stand at the venue when you do this.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={busy} onClick={useMyLocation} className={btnGhostCls}>Use my current location</button>
                    <button
                      disabled={busy}
                      onClick={saveGeo}
                      className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
                    >
                      Save location
                    </button>
                    {geo && <button disabled={busy} onClick={clearGeo} className={btnGhostCls}>Remove</button>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs text-white/50">
                  <button
                    disabled={busy}
                    onClick={() => window.confirm("Make a new code? The old printed code will stop working.") && act("regenerate", "New code created. Reprint it.")}
                    className="underline hover:text-white"
                  >
                    Make a new code
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => window.confirm("Turn off QR check-in? The code, its times and its location will be removed.") && act("disable", "QR check-in is off")}
                    className="underline hover:text-white"
                  >
                    Turn off
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/60">
                The activation and expiry times are set by the DO in charge.
                {geo ? ` Members must be within ${geo.radius} m of the venue to check in.` : ""}
              </p>
            )}
            <p className="text-xs text-white/40">
              Members check in from More, then Check in, or by scanning this code. Each check-in then waits for a leader to
              confirm it.
            </p>
            {devLink && (
              <p className="break-all text-xs text-white/30">
                Test link (development only): <span className="text-white/50">{devLink}</span>
              </p>
            )}
          </div>
        </div>
      )}
      {msg && <p className="mt-4 text-sm text-ok">{msg}</p>}
      {error && <p className="mt-4 text-sm text-bad">{error}</p>}
    </section>
  );
}
