"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { postForm } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

const MAX = 4_000_000;

export default function DocumentForm({ crews, band }: { crews: number[]; band: boolean }) {
  const router = useRouter();
  const [audience, setAudience] = useState<"GENERAL" | "CREW" | "BAND">("GENERAL");
  const [crew, setCrew] = useState(String(crews[0] ?? ""));
  const [reset, setReset] = useState(0);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    const f = new FormData(e.currentTarget);
    const file = f.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Choose a file");
    if (!/\.(pdf|docx?)$/i.test(file.name)) return setError("Upload a PDF or Word document (.pdf, .doc, .docx)");
    if (file.size > MAX) return setError("That file is too large (4 MB maximum)");

    setBusy(true);
    try {
      const out = new FormData();
      out.append("title", String(f.get("title") ?? ""));
      out.append("description", String(f.get("description") ?? ""));
      out.append("audience", audience);
      if (audience === "CREW") out.append("crewId", crew);
      out.append("file", file);
      await postForm("/api/documents", out);
      setMsg("Document uploaded");
      setReset((n) => n + 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form key={reset} onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>Title</label>
        <input name="title" required className={inputCls} placeholder="Division constitution" />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Description (optional)</label>
        <input name="description" className={inputCls} />
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
        <label className={labelCls}>File (PDF or Word, up to 4 MB)</label>
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm text-white/60 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-medium file:text-black"
        />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Uploading..." : "Upload document"}</button>
      </div>
    </form>
  );
}
