"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

type Person = { id: string; fullName: string; crewId: number | null };

export default function MembershipForm({ addable, removable }: { addable: Person[]; removable: Person[] }) {
  const router = useRouter();
  const [action, setAction] = useState<"ADD" | "REMOVE">("ADD");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const list = action === "ADD" ? addable : removable;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/api/crew/membership", "POST", { action, targetUserId: f.get("targetUserId") });
      setMsg("Request sent to the DO Admin");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-xs transition ${
      active ? "border-white bg-white text-black" : "border-white/20 text-white/60 hover:border-white/50"
    }`;

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-card p-6">
      <div className="flex gap-2">
        <button type="button" onClick={() => setAction("ADD")} className={pill(action === "ADD")}>Add a member</button>
        <button type="button" onClick={() => setAction("REMOVE")} className={pill(action === "REMOVE")}>Remove a member</button>
      </div>
      <div>
        <label className={labelCls}>{action === "ADD" ? "Member to add" : "Member to remove"}</label>
        <select key={action} name="targetUserId" required defaultValue="" className={inputCls}>
          <option value="" disabled>Choose</option>
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
              {action === "ADD" ? ` (${p.crewId ? crewName(p.crewId) : "no crew"})` : ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      {msg && <p className="text-sm text-ok">{msg}</p>}
      <button disabled={busy || list.length === 0} className={btnCls}>
        {busy ? "Sending..." : "Send request"}
      </button>
    </form>
  );
}
