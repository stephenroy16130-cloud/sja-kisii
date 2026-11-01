const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.log("sharp is missing. Run: npm install -D sharp");
  process.exit(1);
}

const pub = "public";
const found = fs.readdirSync(pub).find((n) => /^badge\.(png|jpe?g|svg|webp)$/i.test(n));
if (!found) {
  console.log("No public/badge file found.");
  process.exit(1);
}
const input = path.join(pub, found);
fs.mkdirSync(path.join(pub, "icons"), { recursive: true });

// White disc on black, with the badge inside. `frac` is the disc size as a share of the icon.
async function make(size, frac, out) {
  const d = Math.round(size * frac);
  const inner = Math.round(d * 0.72);
  const badge = await sharp(input, { density: 300 })
    .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  const disc = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + d / 2 + '" fill="#ffffff"/></svg>'
  );
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([{ input: disc }, { input: badge, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote " + out);
}

(async () => {
  await make(192, 0.9, "public/icons/icon-192.png");
  await make(512, 0.9, "public/icons/icon-512.png");
  await make(512, 0.7, "public/icons/icon-maskable-512.png"); // extra margin so Android can crop it
  await make(256, 0.92, "src/app/icon.png"); // favicon
  await make(180, 0.86, "src/app/apple-icon.png"); // iPhone home screen

  // One favicon only: remove the default and any older copy
  for (const n of fs.readdirSync("src/app")) {
    if (/^icon\.(ico|jpe?g|svg)$/i.test(n) || n === "favicon.ico") {
      fs.rmSync(path.join("src/app", n));
      console.log("removed src/app/" + n);
    }
  }
})();
