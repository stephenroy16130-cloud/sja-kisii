"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function CreateBandSessionForm() {
  const router = useRouter();
  const [qr, setQr] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const description = String(f.get("description") || "").trim();
    try {
      const created = await api("/api/training", "POST", {
        type: "BAND",
        title: f.get("title"),
        heldAt: new Date(String(f.get("heldAt"))).toISOString(),
        ...(description ? { description } : {}),
      });
      if (qr) {
        try {
          await api(`/api/qr/training/${created.id}`, "PUT", { action: "enable" });
        } catch {
          setError("Created, but QR check-in could not be turned on. Open the session to turn it on.");
        }
      }
      setMsg("Practice created. Open it to set the check-in times and print the QR code.");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Title</label>
        <input name="title" required defaultValue="Band practice" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Date and time</label>
        <input name="heldAt" type="datetime-local" required className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <textarea name="description" rows={2} className={inputCls} />
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" checked={qr} onChange={(e) => setQr(e.target.checked)} className="mt-1 accent-white" />
        <span>
          Enable QR code check-in
          <span className="block text-xs text-white/40">A printable QR code is made instantly. You set when it opens afterwards.</span>
        </span>
      </label>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create practice"}</button>
      </div>
    </form>
  );
}
