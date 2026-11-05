"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import Avatar from "@/components/avatar";
import PhotoCropper from "@/components/photo-cropper";
import { btnGhostCls } from "@/lib/ui";

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
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file");
      return;
    }
    setError("");
    setPicked(file);
  }

  async function upload(blob: Blob) {
    setBusy(true);
    setError("");
    try {
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
    setPicked(null);
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
      {picked && <PhotoCropper file={picked} onCancel={() => setPicked(null)} onDone={upload} />}
    </div>
  );
}
