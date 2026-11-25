const site = (process.argv[2] || "https://sja-kisii.vercel.app").replace(/\/$/, "");

async function get(p) {
  const r = await fetch(site + p, { cache: "no-store", redirect: "manual" });
  return { status: r.status, text: r.status === 200 ? await r.text() : "" };
}

(async () => {
  console.log("Checking " + site + "\n");
  const off = await get("/offline.html");
  const sw = await get("/sw.js");

  console.log("offline.html : HTTP " + off.status);
  if (off.status === 200) {
    const kb = Math.round(off.text.length / 1024);
    console.log("   image embedded in the page: " + (off.text.includes("data:image/") ? "YES" : "NO (this is the old page)") + " (" + kb + " KB)");
  } else {
    console.log("   NOT FOUND on the live site. The file was not pushed, or the deploy has not finished.");
  }

  console.log("sw.js        : HTTP " + sw.status);
  if (sw.status === 200) {
    console.log("   new worker (keeps the offline page, takes over at once): " + (sw.text.includes("sja-offline-") && sw.text.includes("skipWaiting") ? "YES" : "NO (this is the old worker)"));
  } else {
    console.log("   NOT FOUND on the live site.");
  }
})().catch((e) => console.error("Could not reach the site: " + e.message));
