"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export default function AdmissionForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/me/admission", "PUT", { admissionNumber: String(f.get("admissionNumber") ?? "") });
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="mt-4">
      <label className={labelCls}>Admission number</label>
      <div className="flex flex-wrap gap-2">
        <input
          name="admissionNumber"
          defaultValue={initial}
          placeholder="SC211/1234/2022"
          autoCapitalize="characters"
          className={`${inputCls} max-w-xs`}
        />
        <button disabled={busy} className={btnGhostCls}>{busy ? "Saving..." : "Save"}</button>
      </div>
      {msg && <p className="mt-2 text-xs text-ok">{msg}</p>}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </form>
  );
}
