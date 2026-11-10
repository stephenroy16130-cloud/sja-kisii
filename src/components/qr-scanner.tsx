"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;

// Only codes from this very site are followed
function tokenFrom(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.origin !== window.location.origin) return null;
    const m = /^\/checkin\/([A-Za-z0-9_-]{20,40})$/.exec(u.pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export default function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "scanning" | "unsupported" | "denied">("idle");
  const [msg, setMsg] = useState("");

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  async function start() {
    setMsg("");
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) return setPhase("unsupported");
    setPhase("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      stream.current = s;
      const v = video.current;
      if (!v) return stop();
      v.srcObject = s;
      await v.play();
      const detector = new Ctor({ formats: ["qr_code"] });
      setPhase("scanning");
      timer.current = window.setInterval(async () => {
        try {
          for (const c of await detector.detect(v)) {
            const t = tokenFrom(c.rawValue);
            if (t) {
              stop();
              router.push(`/checkin/${t}`);
              return;
            }
            setMsg("That is not a check-in code for this site.");
          }
        } catch {
          // a frame that cannot be read is simply skipped
        }
      }, 400);
    } catch {
      stop();
      setPhase("denied");
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-card p-6">
      <video
        ref={video}
        playsInline
        muted
        className={`mb-4 aspect-square w-full rounded-2xl bg-black object-cover ${phase === "scanning" ? "" : "hidden"}`}
      />
      {phase === "scanning" ? (
        <button onClick={() => { stop(); setPhase("idle"); }} className="rounded-full border border-white/30 px-5 py-2.5 text-xs hover:bg-white hover:text-black">
          Stop
        </button>
      ) : (
        <button
          disabled={phase === "starting"}
          onClick={start}
          data-tip="scan-button"
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {phase === "starting" ? "Opening camera..." : "Scan a check-in code"}
        </button>
      )}
      {phase === "unsupported" && (
        <p className="mt-4 text-sm text-white/60">
          This browser cannot scan inside the app. Open your phone&apos;s camera, point it at the QR code and tap the link that appears.
        </p>
      )}
      {phase === "denied" && (
        <p className="mt-4 text-sm text-warn">Camera access was blocked. Allow the camera for this site in your browser settings, or use your phone&apos;s camera app.</p>
      )}
      {msg && <p className="mt-4 text-sm text-warn">{msg}</p>}
    </div>
  );
}
