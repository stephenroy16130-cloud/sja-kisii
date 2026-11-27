"use client";

import { useEffect } from "react";
import { initOfflineUi } from "@/lib/offline-ui";
import { initPhotoZoom } from "@/lib/photo-zoom";

// Starts the service worker, which keeps the offline page ready and receives phone alerts
export default function PwaRegister() {
  useEffect(() => {
    initOfflineUi();
    initPhotoZoom();
    if (!("serviceWorker" in navigator)) return;

    const start = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        reg.update().catch(() => undefined);
      } catch (e) {
        console.warn("The service worker could not start", e);
      }
    };

    if (document.readyState === "complete") void start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  return null;
}
