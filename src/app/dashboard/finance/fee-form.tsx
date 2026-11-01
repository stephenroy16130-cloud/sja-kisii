"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function FeeForm({ fee }: { fee: number }) {
  const router = useRouter();
  const [v, setV] = useState(fee > 0 ? String(fee) : "");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await api("/api/finance/fee", "PUT", { fee: Number(v || 0) });
      setMsg(Number(v || 0) > 0 ? "Fee saved" : "Fee removed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="w-44">
        <label className={labelCls}>Fee (KES, 0 for none)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="0"
          className={inputCls}
        />
      </div>
      <div className="w-32">
        <button disabled={busy} className={btnCls}>{busy ? "Saving..." : "Save"}</button>
      </div>
      {error && <p className="w-full text-sm text-bad">{error}</p>}
      {msg && <p className="w-full text-sm text-ok">{msg}</p>}
    </form>
  );
}
