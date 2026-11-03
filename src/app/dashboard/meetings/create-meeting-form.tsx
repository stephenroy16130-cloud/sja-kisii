"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function CreateMeetingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const location = String(f.get("location") || "").trim();
    const description = String(f.get("description") || "").trim();
    try {
      const created = await api("/api/meetings", "POST", {
        title: f.get("title"),
        startsAt: new Date(String(f.get("startsAt"))).toISOString(),
        ...(location ? { location } : {}),
        ...(description ? { description } : {}),
      });
      setMsg("Meeting created");
      if (qr) {
        try {
          await api("/api/qr/meeting/" + created.id, "PUT", { action: "enable" });
        } catch {
          setError("Created, but QR check-in could not be turned on. Turn it on from the event page.");
        }
      }
      form.reset();
      setQr(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>Title</label>
        <input name="title" required className={inputCls} placeholder="General Meeting" />
      </div>
      <div>
        <label className={labelCls}>Date and time</label>
        <input name="startsAt" type="datetime-local" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Location</label>
        <input name="location" className={inputCls} placeholder="Main hall" />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <textarea name="description" rows={3} className={inputCls} />
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" checked={qr} onChange={(ev) => setQr(ev.target.checked)} className="mt-1 accent-white" />
        <span>
          Enable QR code check-in
          <span className="block text-xs text-white/40">A printable QR code is created instantly. You set when it opens and closes afterwards.</span>
        </span>
      </label>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create meeting"}</button>
      </div>
    </form>
  );
}
