"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import RichEditor from "@/components/rich-editor";
import { postForm } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { shrinkJpeg } from "@/lib/image-client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function ArticleForm({ crews, band }: { crews: number[]; band: boolean }) {
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [audience, setAudience] = useState<"GENERAL" | "CREW" | "BAND">("GENERAL");
  const [crew, setCrew] = useState(String(crews[0] ?? ""));
  const [notify, setNotify] = useState(false);
  const [count, setCount] = useState(0);
  const [reset, setReset] = useState(0);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const out = new FormData();
      out.append("title", String(f.get("title") ?? ""));
      out.append("content", html);
      out.append("audience", audience);
      if (audience === "CREW") out.append("crewId", crew);
      out.append("notifyMembers", String(notify));
      const picked = (f.getAll("images") as File[]).filter((x) => x.size > 0).slice(0, 4);
      for (let i = 0; i < picked.length; i++) out.append("images", await shrinkJpeg(picked[i]), `image-${i + 1}.jpg`);

      await postForm("/api/articles", out);
      setMsg("Article posted");
      setHtml("");
      setReset((n) => n + 1);
      setCount(0);
      setNotify(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form
      key={reset}
      onSubmit={onSubmit}
      className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2"
    >
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
        <label className={labelCls}>Images (optional, up to 4){count > 0 ? ` · ${count} chosen` : ""}</label>
        <input
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setCount(Math.min(4, e.target.files?.length ?? 0))}
          className="block w-full text-sm text-white/60 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-medium file:text-black"
        />
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1 accent-white" />
        <span>
          Notify members
          <span className="block text-xs text-white/40">
            Saved with the article. Push notifications switch on with the notifications update.
          </span>
        </span>
      </label>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Posting..." : "Post article"}</button>
      </div>
    </form>
  );
}
