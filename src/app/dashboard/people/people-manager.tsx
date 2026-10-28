"use client";
import { crewName } from "@/lib/crews";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/lib/ui";

const TITLES = [
  "CORPORAL", "SERGEANT", "DSM", "BAND_LEAD", "BAND_MEMBER",
  "DO_OPERATIONS", "DO_TRAINING", "DO_ADMIN", "DO_FINANCE",
];
const pretty = (t: string) => t.replace(/_/g, " ");

export type Person = { id: string; fullName: string; username: string; crewId: number | null; titles: string[] };

function TitleChecks({ value, onToggle }: { value: string[]; onToggle: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {TITLES.map((t) => (
        <label key={t} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.includes(t)} onChange={() => onToggle(t)} className="accent-black" />
          {pretty(t)}
        </label>
      ))}
    </div>
  );
}

function PersonRow({ person }: { person: Person }) {
  const router = useRouter();
  const [titles, setTitles] = useState<string[]>(person.titles);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (t: string) =>
    setTitles((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/admin/users/${person.id}/titles`, "PUT", { titles });
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
    <div className="bg-white border border-neutral-300 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">
          {person.fullName} <span className="font-normal text-neutral-500">@{person.username}</span>
          {person.crewId && <span className="ml-2 text-xs text-neutral-500">{crewName(person.crewId)}</span>}
        </p>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-neutral-500">{msg}</span>}
          <button onClick={save} disabled={busy} className={btnGhostCls}>Save titles</button>
        </div>
      </div>
      <TitleChecks value={titles} onToggle={toggle} />
    </div>
  );
}

function ProvisionForm() {
  const router = useRouter();
  const [titles, setTitles] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (t: string) =>
    setTitles((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const crew = String(f.get("crewId") || "");
    try {
      const res = await api("/api/admin/users", "POST", {
        fullName: f.get("fullName"),
        username: f.get("username"),
        email: f.get("email"),
        phone: f.get("phone"),
        password: f.get("password"),
        ...(crew ? { crewId: Number(crew) } : {}),
        titles,
      });
      setMsg(`Created ${res.username}`);
      form.reset();
      setTitles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 bg-white border border-neutral-300 p-6 sm:grid-cols-2">
      <div><label className={labelCls}>Full name</label><input name="fullName" required className={inputCls} /></div>
      <div><label className={labelCls}>Username</label><input name="username" required className={inputCls} /></div>
      <div><label className={labelCls}>Email</label><input name="email" type="email" required className={inputCls} /></div>
      <div><label className={labelCls}>Phone</label><input name="phone" required className={inputCls} /></div>
      <div><label className={labelCls}>Password</label><input name="password" type="password" required className={inputCls} /></div>
      <div>
        <label className={labelCls}>Crew (needed for Corporal / Sergeant)</label>
        <select name="crewId" defaultValue="" className={inputCls}>
          <option value="">None</option>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{crewName(n)}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Titles</label>
        <TitleChecks value={titles} onToggle={toggle} />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create account"}</button></div>
    </form>
  );
}

export default function PeopleManager({ people }: { people: Person[] }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 heading accent-bar text-sm">Create a leader account</h2>
        <ProvisionForm />
      </section>
      <section>
        <h2 className="mb-4 heading accent-bar text-sm">Active members ({people.length})</h2>
        {people.length === 0 ? (
          <div className="bg-white border border-neutral-300 p-6 text-sm text-neutral-500">No other active members yet.</div>
        ) : (
          <div className="space-y-3">
            {people.map((p) => <PersonRow key={p.id + p.titles.join()} person={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
