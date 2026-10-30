// Shrinks an image to a JPEG no larger than `max` pixels on its longest side, in the browser before upload
export async function shrinkJpeg(file: File, max = 1280): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose image files only");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Could not read that image. Try a JPG or PNG.");
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  for (const q of [0.82, 0.65, 0.5]) {
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= 550_000) return blob;
  }
  throw new Error("That image is too large. Choose a smaller one.");
}
