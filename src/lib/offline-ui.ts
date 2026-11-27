const MSG = "You're offline. This needs an internet connection.";
// Pages that cannot work without a connection
const NEEDS_INTERNET = [
  /^\/dashboard\/(scan|pay|store|assistant|profile|members|people|analytics|approvals|approve-attendance|finance)(\/|$)/,
];

let started = false;

function clearSaved() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR" });
  } catch {
    // ignore
  }
}

export function initOfflineUi() {
  if (started || typeof window === "undefined") return;
  started = true;

  if (location.pathname.startsWith("/login")) clearSaved();

  const bar = document.createElement("div");
  bar.setAttribute("role", "status");
  Object.assign(bar.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "2147483000",
    display: "none",
    padding: "calc(env(safe-area-inset-top, 0px) + 6px) 12px 6px",
    background: "#facc15",
    color: "#000",
    font: "500 12px/1.4 system-ui, sans-serif",
    textAlign: "center",
  });
  document.body.appendChild(bar);

  const toast = document.createElement("div");
  Object.assign(toast.style, {
    position: "fixed",
    left: "50%",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
    transform: "translateX(-50%)",
    zIndex: "2147483001",
    display: "none",
    maxWidth: "90vw",
    padding: "10px 16px",
    borderRadius: "999px",
    background: "#fff",
    color: "#000",
    font: "500 13px/1.3 system-ui, sans-serif",
    boxShadow: "0 4px 20px rgba(0,0,0,.4)",
  });
  document.body.appendChild(toast);

  let timer: number | undefined;
  const say = (text: string) => {
    toast.textContent = text;
    toast.style.display = "block";
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      toast.style.display = "none";
    }, 3500);
  };

  async function savedStamp(): Promise<string> {
    try {
      const hit = await caches.match(location.href, { ignoreVary: true });
      if (!hit) return "";
      const t = Date.parse(hit.headers.get("date") || "");
      if (!t) return "";
      const when = new Date(t).toLocaleString("en-KE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Nairobi",
      });
      return " Saved copy from " + when + ".";
    } catch {
      return "";
    }
  }

  async function sync() {
    if (navigator.onLine) {
      bar.style.display = "none";
      return;
    }
    bar.textContent =
      "You're offline. Saved pages still open. Check-in, payments, Ask SJA and changes need a connection." + (await savedStamp());
    bar.style.display = "block";
  }
  window.addEventListener("online", () => void sync());
  window.addEventListener("offline", () => void sync());
  void sync();

  // Any change (save, check-in, payment, question) is refused politely while offline
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!navigator.onLine) {
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        const raw = input instanceof Request ? input.url : String(input);
        let same = false;
        try {
          same = new URL(raw, location.href).origin === location.origin;
        } catch {
          // ignore
        }
        if (same) {
          say(MSG);
          return Promise.reject(new Error(MSG));
        }
      }
    }
    return realFetch(input, init);
  };

  document.addEventListener(
    "click",
    (e) => {
      const el = e.target instanceof Element ? e.target.closest("a,button") : null;
      if (!el) return;
      // Signing out wipes the saved pages from this phone
      if (/\b(log ?out|sign ?out)\b/i.test(el.textContent || "")) clearSaved();
      if (navigator.onLine || !(el instanceof HTMLAnchorElement)) return;
      try {
        const u = new URL(el.href, location.href);
        if (u.origin === location.origin && NEEDS_INTERNET.some((r) => r.test(u.pathname))) {
          e.preventDefault();
          e.stopPropagation();
          say(MSG);
        }
      } catch {
        // ignore
      }
    },
    true
  );
}
