"use client";

import { useEffect, useState } from "react";
import { REPORT_FIELDS, REPORT_KEYS, type ReportKey } from "@/lib/profile";
import { btnGhostCls } from "@/lib/ui";

export default function ReportButton() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Set<ReportKey>>(() => new Set(REPORT_FIELDS.filter((f) => f.on).map((f) => f.key)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (k: ReportKey) =>
    setSel((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  async function exportCsv() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/members/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: REPORT_KEYS.filter((k) => sel.has(k)) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Export failed");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "members.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
    setBusy(false);
  }

  const groups = [...new Set(REPORT_FIELDS.map((f) => f.group))];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnGhostCls}>
        Generate Member Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-card p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-light">Member report</h3>
                <p className="mt-1 text-sm text-white/50">Tick the details you need. Every active member is included.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none text-white/50 hover:text-white">
                ×
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {groups.map((g) => (
                <div key={g}>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-gold">{g}</p>
                  <div className="space-y-2">
                    {REPORT_FIELDS.filter((f) => f.group === g).map((f) => (
                      <label key={f.key} className="flex cursor-pointer items-center gap-3 text-sm">
                        <input type="checkbox" checked={sel.has(f.key)} onChange={() => toggle(f.key)} className="accent-white" />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-white/50">
              <button type="button" onClick={() => setSel(new Set(REPORT_KEYS))} className="underline hover:text-white">
                Select all
              </button>
              <button type="button" onClick={() => setSel(new Set())} className="underline hover:text-white">
                Clear
              </button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-white/40">
              This file contains personal data. Store it securely and delete it when done. Every export is recorded in
              the audit log.
            </p>
            {error && <p className="mt-3 text-sm text-bad">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className={btnGhostCls}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || sel.size === 0}
                onClick={exportCsv}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
              >
                {busy ? "Exporting..." : `Export (${sel.size})`}
              </button>
            </div>
            <p className="mt-3 text-right text-[11px] text-white/30">Downloads a CSV file that opens in Excel.</p>
          </div>
        </div>
      )}
    </>
  );
}
