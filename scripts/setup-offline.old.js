const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");

const IMG = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;

function searchDirs() {
  const home = os.homedir();
  const dirs = [
    path.join(home, "Downloads"),
    path.join(home, "OneDrive", "Downloads"),
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Downloads") : null,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "OneDrive", "Downloads") : null,
  ].filter(Boolean);
  return [...new Set(dirs)].filter((d) => fs.existsSync(d));
}

function findImage() {
  const given = process.argv[2];
  if (given) {
    if (fs.existsSync(given)) return given;
    console.log("That path does not exist: " + given);
    return null;
  }
  const dirs = searchDirs();
  console.log("Looking in: " + (dirs.join(" | ") || "(no Downloads folder found)"));
  const hits = [];
  for (const d of dirs) {
    for (const f of fs.readdirSync(d)) {
      if (f.toLowerCase().startsWith("sjaoffline")) hits.push(path.join(d, f));
    }
  }
  if (hits.length === 0) {
    for (const d of dirs) {
      const near = fs.readdirSync(d).filter((f) => /sja|offline|ambul/i.test(f));
      if (near.length) console.log("Files that look related in " + d + ": " + near.join(", "));
    }
    console.log("\nNo file starting with 'sjaoffline' was found.");
    console.log('You can pass the exact path instead:  node scripts/setup-offline.js "C:/Users/HomePC/Downloads/yourfile.jpg"');
    return null;
  }
  const usable = hits
    .filter((f) => IMG.test(f))
    .map((f) => ({ f, t: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (usable.length === 0) {
    console.log("Found " + hits.join(", ") + " but it is not a photo type I can read (a phone HEIC file?).");
    console.log("Open it in Photos, save it as a JPG or PNG, and run this again.");
    return null;
  }
  return usable[0].f;
}

function contact() {
  try {
    const t = fs.readFileSync("src/lib/contact.ts", "utf8");
    const display = /display:\s*"([^"]+)"/.exec(t);
    const tel = /tel:\s*"([^"]+)"/.exec(t);
    if (display && tel) return { display: display[1], tel: tel[1] };
  } catch {
    // fall through
  }
  return { display: "0721 225285", tel: "+254721225285" };
}

// Keep the notification icons the old worker used
function oldIcons() {
  try {
    const t = fs.readFileSync("public/sw.js", "utf8");
    const i = /icon:\s*["']([^"']+)["']/.exec(t);
    const b = /badge:\s*["']([^"']+)["']/.exec(t);
    return { icon: i ? i[1] : null, badge: b ? b[1] : null };
  } catch {
    return { icon: null, badge: null };
  }
}

const SW = `// SJA Kisii service worker. Written by scripts/setup-offline.js. Version __VERSION__
const VERSION = "__VERSION__";
const CACHE = "sja-offline-" + VERSION;
const OFFLINE = "/offline.html";
const ICON = __ICON__;
const BADGE = __BADGE__;

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
`;

(async () => {
  const src = findImage();
  if (!src) return;
  console.log("Using " + src);

  const buf = await sharp(src)
    .rotate()
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const data = "data:image/webp;base64," + buf.toString("base64");
  const c = contact();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#000000" />
<title>Offline · SJA Kisii</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #000; color: #fff; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; text-align: center; }
  main { width: 100%; max-width: 360px; }
  img { display: block; width: 100%; height: auto; margin: 0 auto 28px; border-radius: 20px; }
  h1 { margin: 0 0 10px; font-size: 26px; font-weight: 300; }
  p { margin: 0; color: rgba(255, 255, 255, 0.65); font-size: 15px; line-height: 1.5; }
  button { margin-top: 24px; padding: 13px 28px; border: 0; border-radius: 999px; background: #fff; color: #000; font-size: 14px; font-weight: 500; cursor: pointer; }
  .sos { margin-top: 32px; font-size: 12px; color: rgba(255, 255, 255, 0.45); }
  .sos a { display: block; margin-top: 4px; color: #f87171; font-size: 20px; text-decoration: none; }
</style>
</head>
<body>
<main>
  <img src="${data}" alt="St. John Ambulance Kisii University" />
  <h1>You&rsquo;re offline</h1>
  <p>Check your connection, then try again.</p>
  <button onclick="location.reload()">Try again</button>
  <p class="sos">St. John Ambulance emergency<a href="tel:${c.tel}">${c.display}</a></p>
</main>
<script>window.addEventListener("online", function () { location.reload(); });</script>
</body>
</html>
`;
  fs.writeFileSync("public/offline.html", html);

  const old = fs.existsSync("public/sw.js") ? fs.readFileSync("public/sw.js", "utf8") : null;
  if (old !== null) fs.writeFileSync(".tmp/sw.old.js", old);
  let { icon, badge } = oldIcons();
  if (!icon && fs.existsSync("public/icons/icon-192.png")) icon = "/icons/icon-192.png";
  const version = Date.now().toString(36);
  const sw = SW.split("__VERSION__").join(version).split("__ICON__").join(JSON.stringify(icon)).split("__BADGE__").join(JSON.stringify(badge));
  fs.writeFileSync("public/sw.js", sw);

  console.log("\nWrote public/offline.html (" + Math.round(html.length / 1024) + " KB, image embedded: " + html.includes("data:image/webp;base64,") + ")");
  console.log("Wrote public/sw.js (version " + version + "). The old one is saved at .tmp/sw.old.js");
  console.log("Notification icon kept: " + (icon || "none") + ", badge: " + (badge || "none"));
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
