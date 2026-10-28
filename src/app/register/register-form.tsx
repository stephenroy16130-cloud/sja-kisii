"use client";
import { crewName } from "@/lib/crews";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function RegisterForm() {
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await api("/api/auth/register", "POST", {
        fullName: f.get("fullName"),
        username: f.get("username"),
        email: f.get("email"),
        phone: f.get("phone"),
        crewId: Number(f.get("crewId")),
        password: f.get("password"),
      });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (done) return <div className="bg-neutral-100 p-4 text-sm">{done}</div>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Full name</label>
        <input name="fullName" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Username</label>
        <input name="username" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input name="phone" required placeholder="0712345678" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Crew</label>
        <select name="crewId" required defaultValue="1" className={inputCls}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{crewName(n)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Password</label>
        <input name="password" type="password" required className={inputCls} />
        <p className="mt-1 text-xs text-neutral-500">At least 8 characters with an uppercase letter, a lowercase letter and a number.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className={btnCls}>{busy ? "Submitting..." : "Register"}</button>
    </form>
  );
}
