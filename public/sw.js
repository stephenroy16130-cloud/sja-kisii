// SJA Kisii service worker. Written by scripts/setup-offline.js. Version mwvr9esh
const VERSION = "mwvr9esh";
const CACHE = "sja-offline-" + VERSION;
const OFFLINE = "/offline.html";
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/icon-192.png";

// Fetch a fresh copy of the offline page, keep it, and take over from any older worker at once
self.addEventListener("install", function (event) {
  event.waitUntil(
    (async function () {
      const res = await fetch(OFFLINE, { cache: "reload" });
      if (!res.ok) throw new Error("The offline page could not be fetched");
      const cache = await caches.open(CACHE);
      await cache.put(OFFLINE, res);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      await self.clients.claim();
    })()
  );
});

// Opening or reloading a page with no connection shows the offline page
self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(async function () {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(OFFLINE);
      return hit || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
    })
  );
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
