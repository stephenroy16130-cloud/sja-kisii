"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import Avatar from "@/components/avatar";
import { btnGhostCls } from "@/lib/ui";

// Crops to a centred square and shrinks to a 400px JPEG in the browser before upload
async function toSquareJpeg(file: File, size: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Could not read that image. Try a JPG or PNG.");
  }
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the image"))), "image/jpeg", 0.85)
  );
}

export default function PhotoUploader({
  kind,
  src,
  name,
}: {
  kind: "OFFICIAL" | "SOCIAL";
  src: string | null;
  name: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await toSquareJpeg(file, 400);
      const form = new FormData();
      form.append("kind", kind);
      form.append("photo", blob, "photo.jpg");
      const res = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={src} size={88} />
      <div>
        <input ref={input} type="file" accept="image/*" onChange={onPick} className="hidden" />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={btnGhostCls}>
          {busy ? "Uploading..." : src ? "Change photo" : "Upload photo"}
        </button>
        {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      </div>
    </div>
  );
}
