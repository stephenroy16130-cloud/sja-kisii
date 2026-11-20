const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");

const IMG = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
const downloads = path.join(os.homedir(), "Downloads");
const pos = process.argv[2] || "attention";
const POS = {
  attention: sharp.strategy.attention,
  entropy: sharp.strategy.entropy,
  centre: "centre",
  center: "centre",
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

(async () => {
  let files = [];
  try {
    files = fs.readdirSync(downloads);
  } catch {
    console.log("Could not open " + downloads);
    return;
  }
  const match = files.filter((f) => f.toLowerCase().startsWith("sjaintro"));
  if (match.length === 0) {
    console.log("No file starting with 'sjaintro' in " + downloads);
    const near = files.filter((f) => /sja|john|ambul/i.test(f));
    if (near.length) console.log("Files that look related: " + near.join(", "));
    return;
  }
  const usable = match
    .filter((f) => IMG.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(downloads, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (usable.length === 0) {
    console.log("Found " + match.join(", ") + " but it is not a photo type I can read (a phone HEIC file?).");
    console.log("Open it in Photos, save it as a JPG, and run this again.");
    return;
  }

  const src = path.join(downloads, usable[0].f);
  const out = path.join("public", "sjaintro.jpg");
  await sharp(src)
    .rotate()
    .resize(720, 720, { fit: "cover", position: POS[pos] || sharp.strategy.attention })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log("Saved " + out + " (" + Math.round(fs.statSync(out).size / 1024) + " KB) from " + usable[0].f + ", crop: " + pos);
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
