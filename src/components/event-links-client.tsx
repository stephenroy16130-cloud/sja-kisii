"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export function AddLinkForm({ kind, id }: { kind: string; id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api(`/api/events/${kind}/${id}/links`, "POST", { title: f.get("title"), url: f.get("url") });
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Title</label>
        <input name="title" required maxLength={100} placeholder="Meeting agenda" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Google link</label>
        <input name="url" type="url" required placeholder="https://docs.google.com/..." className={inputCls} />
      </div>
      <p className="text-xs text-white/40 sm:col-span-2">
        Set the Google file to &ldquo;Anyone with the link can view&rdquo;, or members will be asked to sign in to Google.
      </p>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          disabled={busy}
          className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Adding..." : "Add link"}
        </button>
      </div>
    </form>
  );
}

export function RemoveLinkButton({ kind, id, linkId }: { kind: string; id: string; linkId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Remove this link?")) return;
    setBusy(true);
    try {
      await api(`/api/events/${kind}/${id}/links/${linkId}`, "DELETE");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button disabled={busy} onClick={remove} className={btnGhostCls}>
      {busy ? "Removing..." : "Remove"}
    </button>
  );
}
