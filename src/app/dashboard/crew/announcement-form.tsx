"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function AnnouncementForm() {
  const router = useRouter();
  const [rsvp, setRsvp] = useState(false);
  const [pay, setPay] = useState(false);
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
    const when = String(f.get("eventDate") || "");
    const label = String(f.get("paymentLabel") || "").trim();
    try {
      await api("/api/crew/announcements", "POST", {
        title: f.get("title"),
        body: f.get("body"),
        requiresRsvp: rsvp,
        ...(when ? { eventDate: new Date(when).toISOString() } : {}),
        ...(pay ? { paymentAmount: Number(f.get("paymentAmount")), ...(label ? { paymentLabel: label } : {}) } : {}),
      });
      setMsg("Announcement posted");
      form.reset();
      setRsvp(false);
      setPay(false);
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
        <input name="title" required className={inputCls} placeholder="Crew picnic" />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Message</label>
        <textarea name="body" required rows={3} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Event date (optional)</label>
        <input name="eventDate" type="datetime-local" className={inputCls} />
      </div>
      <div className="flex flex-col justify-end gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rsvp} onChange={(e) => setRsvp(e.target.checked)} className="accent-white" />
          Ask members to RSVP
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} className="accent-white" />
          Members pay a fee
        </label>
      </div>
      {pay && (
        <>
          <div>
            <label className={labelCls}>Amount (KES)</label>
            <input name="paymentAmount" type="number" min="1" step="0.01" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>What it is for</label>
            <input name="paymentLabel" className={inputCls} placeholder="Picnic contribution" />
          </div>
        </>
      )}
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Posting..." : "Post announcement"}</button>
      </div>
    </form>
  );
}
