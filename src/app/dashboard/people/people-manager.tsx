"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import PasswordInput from "@/components/password-input";
import { api } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/lib/ui";

const TITLES = [
  "CORPORAL", "SERGEANT", "DSM", "BAND_LEAD", "BAND_MEMBER",
  "DO_OPERATIONS", "DO_TRAINING", "DO_ADMIN", "DO_FINANCE",
];
const pretty = (t: string) => t.replace(/_/g, " ");

export type Person = { id: string; fullName: string; username: string; crewId: number | null; titles: string[] };

function TitleChecks({
  value,
  onToggle,
  blockNew,
  held,
}: {
  value: string[];
  onToggle: (t: string) => void;
  blockNew?: boolean;
  held?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {TITLES.map((t) => {
        const blocked = Boolean(blockNew) && !(held ?? []).includes(t);
        return (
          <label key={t} className={`flex items-center gap-2 text-sm ${blocked ? "opacity-40" : ""}`}>
            <input
              type="checkbox"
              checked={value.includes(t)}
              disabled={blocked}
              onChange={() => onToggle(t)}
              className="accent-white"
            />
            {pretty(t)}
          </label>
        );
      })}
    </div>
  );
}

function LeadershipLock({ locked, vacant }: { locked: boolean; vacant: string[] }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function apply() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/settings/leadership", "PUT", { locked: !locked });
      setAsk(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
    <section className={`rounded-3xl border p-6 ${locked ? "border-bad/40" : "border-gold/40"} bg-card`}>
      <p className="flex items-center gap-2 text-sm">
        <span className={`h-2 w-2 rounded-full ${locked ? "bg-bad" : "bg-ok"}`} />
        {locked ? "Promotions are locked" : "Promotions are open"}
      </p>

      {locked ? (
        <p className="mt-2 text-sm text-white/60">
          You can no longer add titles or create leader accounts. You can still demote leaders. Reopen promotions when
          you need to replace someone.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-white/60">
            When every leadership post is filled, finish the setup to shut promotions.
          </p>
          {vacant.length > 0 ? (
            <div className="mt-3 rounded-2xl bg-white/5 p-4 text-sm">
              <p className="text-warn">Still vacant ({vacant.length})</p>
              <ul className="mt-2 space-y-1 text-white/70">
                {vacant.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ok">Every post has a holder.</p>
          )}
        </>
      )}

      <div className="mt-4">
        {!ask ? (
          <button onClick={() => setAsk(true)} className={btnGhostCls}>
            {locked ? "Reopen promotions" : "Finish leadership setup"}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-white/70">
              {locked ? "Reopen promotions?" : vacant.length > 0 ? "Lock with vacant posts?" : "Lock promotions?"}
            </span>
            <button
              disabled={busy}
              onClick={apply}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Yes"}
            </button>
            <button disabled={busy} onClick={() => setAsk(false)} className={btnGhostCls}>
              Cancel
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </div>
    </section>
  );
}

function PersonRow({ person, locked }: { person: Person; locked: boolean }) {
  const router = useRouter();
  const [titles, setTitles] = useState<string[]>(person.titles);
  const [crew, setCrew] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (t: string) =>
    setTitles((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/admin/users/${person.id}/titles`, "PUT", { titles, ...(crew ? { crewId: Number(crew) } : {}) });
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">
          {person.fullName} <span className="font-normal text-white/50">@{person.username}</span>
          {person.crewId && <span className="ml-2 text-xs text-white/50">{crewName(person.crewId)}</span>}
        </p>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-white/50">{msg}</span>}
          <button onClick={save} disabled={busy} className={btnGhostCls}>Save titles</button>
        </div>
      </div>
      {!person.crewId && (
        <div className="mb-4 max-w-xs">
          <label className={labelCls}>Choose this leader&apos;s crew</label>
          <select value={crew} onChange={(e) => setCrew(e.target.value)} className={inputCls}>
            <option value="">No crew yet</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{crewName(n)}</option>
            ))}
          </select>
        </div>
      )}
      <TitleChecks value={titles} onToggle={toggle} blockNew={locked} held={person.titles} />
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
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div><label className={labelCls}>Full name</label><input name="fullName" required className={inputCls} /></div>
      <div><label className={labelCls}>Username</label><input name="username" required className={inputCls} /></div>
      <div><label className={labelCls}>Email</label><input name="email" type="email" required className={inputCls} /></div>
      <div><label className={labelCls}>Phone</label><input name="phone" required className={inputCls} /></div>
      <div><label className={labelCls}>Password</label><PasswordInput name="password" /></div>
      <div>
        <label className={labelCls}>Crew (required for every leader)</label>
        <select name="crewId" defaultValue="" required={titles.length > 0} className={inputCls}>
          <option value="">Choose a crew</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{crewName(n)}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Titles</label>
        <TitleChecks value={titles} onToggle={toggle} />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create account"}</button></div>
    </form>
  );
}

export default function PeopleManager({
  people,
  locked,
  vacant,
}: {
  people: Person[];
  locked: boolean;
  vacant: string[];
}) {
  return (
    <div className="space-y-10">
      <LeadershipLock locked={locked} vacant={vacant} />

      {!locked && (
        <section>
          <h2 className="mb-4 text-xl font-light">Create a leader account</h2>
          <ProvisionForm />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-light">Active members ({people.length})</h2>
        {people.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            No other active members yet.
          </div>
        ) : (
          <div className="space-y-3">
            {people.map((p) => (
              <PersonRow key={p.id + p.titles.join()} person={p} locked={locked} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
