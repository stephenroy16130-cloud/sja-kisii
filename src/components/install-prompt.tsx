"use client";

import { useEffect, useRef, useState } from "react";
import Badge from "./badge";

type Deferred = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KEY = "sja-install-asked";

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function InstallPrompt({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<"native" | "ios" | null>(null);
  const [open, setOpen] = useState(false);
  const deferred = useRef<Deferred | null>(null);

  // Work out whether this device can install the app, and catch the browser's install event
  useEffect(() => {
    if (isInstalled()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as Deferred;
      setMode("native");
    };
    const onInstalled = () => {
      deferred.current = null;
      setOpen(false);
      setMode(null);
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos()) setMode("ios");
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Show it once per visit, after any tour or reveal has gone away
  useEffect(() => {
    if (!enabled || !mode) return;
    let asked = false;
    try {
      asked = sessionStorage.getItem(KEY) === "1";
    } catch {
      // ignore
    }
    if (asked) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (!document.querySelector('[role="dialog"]')) {
        clearInterval(timer);
        setOpen(true);
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [enabled, mode]);

  function remember() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  }
  function dismiss() {
    remember();
    setOpen(false);
  }
  async function install() {
    const p = deferred.current;
    if (!p) return dismiss();
    try {
      await p.prompt();
      await p.userChoice;
    } catch {
      // the browser said no
    }
    deferred.current = null;
    dismiss();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install the app"
      onClick={dismiss}
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/70 p-4 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-card p-7 text-center"
      >
        <div className="flex justify-center">
          <Badge size={64} />
        </div>
        <h2 className="mt-5 text-xl font-light">Install SJA Kisii</h2>
        <p className="font-copy mt-2 text-sm leading-relaxed text-white/70">
          Add the app to your device for one-tap access, faster loading, and alerts about meetings and payments.
        </p>

        {mode === "ios" && (
          <ol className="mt-4 space-y-2 rounded-2xl bg-white/5 p-4 text-left text-sm text-white/80">
            <li>1. Tap the <span className="text-white">Share</span> button (the square with an arrow) in Safari.</li>
            <li>2. Choose <span className="text-white">Add to Home Screen</span>.</li>
            <li>3. Tap <span className="text-white">Add</span>.</li>
            <li className="text-xs text-white/40">Don&apos;t see it? Open this page in Safari first.</li>
          </ol>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {mode === "native" && (
            <button
              onClick={install}
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              Install app
            </button>
          )}
          <button
            onClick={dismiss}
            className="rounded-full border border-white/30 px-6 py-3 text-sm text-white/80 transition hover:bg-white hover:text-black"
          >
            {mode === "ios" ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
    </div>
  );
}
