"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/lib/ui";

type Settings = { push: boolean; email: string; whatsapp: string; scope: "all" | "shop" };
type Ready = { push: boolean; email: boolean; whatsapp: boolean };
type Report = { push: string; email: string; whatsapp: string };

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em] ${ok ? "border-ok/50 text-ok" : "border-white/20 text-white/40"}`}>
      {label}
    </span>
  );
}

export default function AlertsForm({ initial, ready }: { initial: Settings; ready: Ready }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = (await api("/api/finance/alerts", "PUT", s)) as Settings;
      setS(r);
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      setReport((await api("/api/finance/alerts/test", "POST")) as Report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-6 rounded-3xl border border-white/10 bg-card p-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={s.push} onChange={(e) => setS({ ...s, push: e.target.checked })} className="accent-white" />
            Push notification to DO Finance devices
          </label>
          <Chip ok={ready.push} label={ready.push ? "Ready" : "Not set up"} />
        </div>
        <p className="mt-1 text-xs text-white/40">Instant and free. Each DO Finance member turns notifications on in My profile.</p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className={labelCls}>Email address to alert</label>
          <Chip ok={ready.email} label={ready.email ? "Ready" : "Email not set up"} />
        </div>
        <input value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} type="email" placeholder="finance@example.com" className={inputCls} />
        <p className="mt-1 text-xs text-white/40">Leave empty for no email alerts. You can change it whenever you like.</p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className={labelCls}>WhatsApp number to alert</label>
          <Chip ok={ready.whatsapp} label={ready.whatsapp ? "Ready" : "WhatsApp not set up"} />
        </div>
        <input value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} inputMode="tel" placeholder="0712345678 or 254712345678" className={inputCls} />
        <p className="mt-1 text-xs text-white/40">
          Leave empty for no WhatsApp alerts. Automatic WhatsApp messages need Meta&apos;s WhatsApp Business setup.
        </p>
      </div>

      <div>
        <label className={labelCls}>Alert me about</label>
        <select value={s.scope} onChange={(e) => setS({ ...s, scope: e.target.value as Settings["scope"] })} className={inputCls}>
          <option value="all">Every M-Pesa payment (shop, fees, crew events and activities)</option>
          <option value="shop">Shop orders only</option>
        </select>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}
      {msg && <p className="text-sm text-ok">{msg}</p>}
      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <button disabled={busy} className={btnCls}>{busy ? "Working..." : "Save"}</button>
        </div>
        <button type="button" disabled={busy} onClick={test} className={btnGhostCls}>
          Send test alert
        </button>
      </div>
      <p className="text-xs text-white/40">Save first, then send a test. The test uses the saved settings.</p>

      {report && (
        <div className="rounded-2xl bg-white/5 p-4 text-sm">
          <p>Push: <span className="text-white/70">{report.push}</span></p>
          <p className="mt-1">Email: <span className="text-white/70">{report.email}</span></p>
          <p className="mt-1">WhatsApp: <span className="text-white/70">{report.whatsapp}</span></p>
        </div>
      )}
    </form>
  );
}
