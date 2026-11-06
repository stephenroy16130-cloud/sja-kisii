"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import MultiPhotoPicker from "@/components/multi-photo-picker";
import RichEditor from "@/components/rich-editor";
import { api, postForm } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { shrinkJpeg } from "@/lib/image-client";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/lib/ui";

const MAX_PHOTOS = 10;
const PUBLISHING = "Publishing...";

export default function ArticleForm({ crews, band }: { crews: number[]; band: boolean }) {
  const router = useRouter();
  const cancelled = useRef(false);
  const [html, setHtml] = useState("");
  const [audience, setAudience] = useState<"GENERAL" | "CREW" | "BAND">("GENERAL");
  const [crew, setCrew] = useState(String(crews[0] ?? ""));
  const [notify, setNotify] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [reset, setReset] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    cancelled.current = false;
    const f = new FormData(e.currentTarget);
    const ids: string[] = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        if (cancelled.current) throw new Error("Cancelled");
        setStatus(`Uploading photo ${i + 1} of ${photos.length}...`);
        const out = new FormData();
        out.append("image", await shrinkJpeg(photos[i]), `photo-${i + 1}.jpg`);
        const r = await postForm("/api/articles/images", out);
        ids.push(r.id);
      }
      if (cancelled.current) throw new Error("Cancelled");
      setStatus(PUBLISHING);
      await api("/api/articles", "POST", {
        title: f.get("title"),
        content: html,
        audience,
        ...(audience === "CREW" ? { crewId: Number(crew) } : {}),
        notifyMembers: notify,
        imageIds: ids,
      });
      setMsg("Article posted");
      setHtml("");
      setPhotos([]);
      setNotify(false);
      setReset((n) => n + 1);
      router.refresh();
    } catch (err) {
      // Throw away photos that were uploaded but never used (the server keeps any that an article uses)
      if (ids.length) await api("/api/articles/images", "DELETE", { ids }).catch(() => undefined);
      setError(
        cancelled.current
          ? "Cancelled. Any uploaded photos were removed."
          : err instanceof Error
            ? err.message
            : "Something went wrong"
      );
    }
    setStatus("");
    setBusy(false);
  }

  return (
    <form key={reset} onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>Title</label>
        <input name="title" required className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Article</label>
        <RichEditor onChange={setHtml} resetKey={reset} />
      </div>
      <div>
        <label className={labelCls}>Who can see it</label>
        <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} className={inputCls}>
          <option value="GENERAL">Everyone</option>
          {crews.length > 0 && <option value="CREW">A crew</option>}
          {band && <option value="BAND">The Band</option>}
        </select>
      </div>
      {audience === "CREW" && (
        <div>
          <label className={labelCls}>Crew</label>
          <select value={crew} onChange={(e) => setCrew(e.target.value)} className={inputCls}>
            {crews.map((c) => (
              <option key={c} value={c}>{crewName(c)}</option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={labelCls}>Photos (optional, up to {MAX_PHOTOS})</label>
        <MultiPhotoPicker files={photos} onChange={setPhotos} max={MAX_PHOTOS} />
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1 accent-white" />
        <span>
          Notify members
          <span className="block text-xs text-white/40">Sends a push notification to the people who can see this article.</span>
        </span>
      </label>
      {busy && status && <p className="text-sm text-gold sm:col-span-2">{status}</p>}
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Please wait..." : "Post article"}</button>
        {busy && status !== PUBLISHING && (
          <button
            type="button"
            onClick={() => {
              cancelled.current = true;
              setStatus("Cancelling...");
            }}
            className={`${btnGhostCls} shrink-0`}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
