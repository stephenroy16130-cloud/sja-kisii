"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { DOC_MIME, docExt, MAX_DOC_BYTES } from "@/lib/doc-files";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function DocumentForm({ crews, band, userId }: { crews: number[]; band: boolean; userId: string }) {
  const router = useRouter();
  const [audience, setAudience] = useState<"GENERAL" | "CREW" | "BAND">("GENERAL");
  const [crew, setCrew] = useState(String(crews[0] ?? ""));
  const [reset, setReset] = useState(0);
  const [progress, setProgress] = useState(0);
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
    const ext = docExt(file.name);
    if (!ext) return setError("Upload a PDF or Word document (.pdf, .doc, .docx)");
    if (file.size > MAX_DOC_BYTES) {
      return setError(`That file is too large (${Math.round(MAX_DOC_BYTES / 1048576)} MB maximum)`);
    }

    setBusy(true);
    setProgress(0);
    const crewId = audience === "CREW" ? Number(crew) : null;
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const blob = await upload(`documents/${userId}/${safe}`, file, {
        access: "private",
        handleUploadUrl: "/api/documents/upload",
        contentType: DOC_MIME[ext],
        clientPayload: JSON.stringify({ audience, crewId }),
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      await api("/api/documents", "POST", {
        title: f.get("title"),
        description: String(f.get("description") ?? ""),
        audience,
        crewId,
        pathname: blob.pathname,
        fileName: file.name,
        size: file.size,
      });
      setMsg("Document published");
      setReset((n) => n + 1);
      router.refresh();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Something went wrong";
      setError(/token/i.test(m) ? "The upload was refused. Check that you may publish to that audience." : m);
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
        <label className={labelCls}>File (PDF or Word, up to 100 MB)</label>
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm text-white/60 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-medium file:text-black"
        />
      </div>
      {busy && (
        <div className="sm:col-span-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/50">Uploading {progress}%. Keep this page open until it finishes.</p>
        </div>
      )}
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Uploading..." : "Upload document"}</button>
      </div>
    </form>
  );
}
