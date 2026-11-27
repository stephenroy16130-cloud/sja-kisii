// SJA Kisii service worker: offline mode and push. Do not re-run scripts/setup-offline.js, it would overwrite this file.
// scripts/make-offline.js may add an "// offline page updated" line at the end. That is fine.
const VERSION = "offline-2";
const SHELL = "sja-offline-" + VERSION;
const PAGES = "sja-pages";
const STATIC = "sja-static";
const OFFLINE = "/offline.html";
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/icon-192.png";
const MAX_AGE = 7 * 24 * 3600 * 1000; // saved pages older than a week are dropped
const SLOW_MS = 5000; // on a slow connection, show the saved copy after this long
const LOCAL = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

// Pages that may be saved for offline reading (your real routes)
const ALLOW = [
  /^\/dashboard\/?$/,
  /^\/dashboard\/(meetings|fieldops|training|attendance|articles|documents|crew|notifications|band)(\/|$)/,
];
// Never saved: private, financial, admin and AI pages
const DENY = [
  /^\/dashboard\/(profile|pay|store|assistant|members|people|scan|analytics|approvals|approve-attendance|finance)(\/|$)/,
  /^\/api\//,
];

function canSave(path) {
  if (DENY.some(function (r) { return r.test(path); })) return false;
  return ALLOW.some(function (r) { return r.test(path); });
}
function isStatic(url) {
  const p = url.pathname;
  return p.startsWith("/_next/static/") || p.startsWith("/icons/") || /^\/[^/]+\.(?:webp|jpe?g|png|svg|ico)$/.test(p);
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    (async function () {
      const res = await fetch(OFFLINE, { cache: "reload" });
      if (!res.ok) throw new Error("The offline page could not be fetched");
      const cache = await caches.open(SHELL);
      await cache.put(OFFLINE, res);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(function (k) {
            return (k.startsWith("sja-offline-") && k !== SHELL) || (LOCAL && (k === PAGES || k === STATIC));
          })
          .map(function (k) { return caches.delete(k); })
      );
      await self.clients.claim();
    })()
  );
});

// The app asks for saved pages to be wiped when someone signs out
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "CLEAR") event.waitUntil(caches.delete(PAGES));
});

async function savedCopy(cache, key) {
  const hit = await cache.match(key, { ignoreVary: true });
  if (!hit) return null;
  const t = Date.parse(hit.headers.get("date") || "");
  if (t && Date.now() - t > MAX_AGE) {
    await cache.delete(key);
    return null;
  }
  return hit;
}

async function keepCopy(cache, key, res) {
  // A redirect or 401/403/404 means the session ended or the page is gone, so forget the saved copy
  if (res.type === "opaqueredirect" || res.redirected || res.status === 401 || res.status === 403 || res.status === 404) {
    await cache.delete(key);
    return;
  }
  if (!res.ok) return;
  if ((res.headers.get("content-type") || "").indexOf("text/html") < 0) return;
  await cache.put(key, res);
}

async function openPage(event, req, url) {
  const save = canSave(url.pathname);
  const cache = await caches.open(PAGES);
  const key = req.url;
  const saved = save ? await savedCopy(cache, key) : null;

  const network = fetch(req).then(function (res) {
    if (save) event.waitUntil(keepCopy(cache, key, res.clone()));
    return res;
  });

  if (saved) {
    const first = await Promise.race([
      network.catch(function () { return null; }),
      new Promise(function (done) { setTimeout(function () { done(null); }, SLOW_MS); }),
    ]);
    if (first) return first;
    event.waitUntil(network.catch(function () { return null; })); // keep updating in the background
    return saved;
  }
  try {
    return await network;
  } catch (e) {
    const shell = await caches.open(SHELL);
    return (await shell.match(OFFLINE)) || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function staticFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response("", { status: 504 });
  }
}

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET" || LOCAL) return; // on localhost nothing is cached, so development is not confused by old files
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    if (/^\/login/.test(url.pathname)) event.waitUntil(caches.delete(PAGES));
    event.respondWith(openPage(event, req, url));
  } else if (isStatic(url)) {
    event.respondWith(staticFirst(req));
  }
});

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const options = { body: data.body || "", data: { url: data.url || "/dashboard" } };
  if (data.tag) options.tag = data.tag;
  if (ICON) options.icon = ICON;
  if (BADGE) options.badge = BADGE;
  event.waitUntil(self.registration.showNotification(data.title || "St. John Ambulance", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async function () {
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) {
            try { await c.navigate(url); } catch (e) { /* ignore */ }
          }
          return;
        }
      }
      await clients.openWindow(url);
    })()
  );
});
