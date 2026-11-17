"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export default function EditDocument({ id, title, description }: { id: string; title: string; description: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/documents/${id}`, "PUT", { title: f.get("title"), description: String(f.get("description") ?? "") });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnGhostCls}>Edit</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setOpen(false)}>
          <form
            onSubmit={save}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-card p-7"
          >
            <h3 className="text-xl font-light">Edit document</h3>
            <div>
              <label className={labelCls}>Title</label>
              <input name="title" required defaultValue={title} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea name="description" rows={3} defaultValue={description} className={inputCls} />
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className={btnGhostCls}>Cancel</button>
              <button
                disabled={busy}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
