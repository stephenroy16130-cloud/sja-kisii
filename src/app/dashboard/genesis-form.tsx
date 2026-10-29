"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function GenesisForm() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await api("/api/dev/create-superintendent", "POST", {
        fullName: f.get("fullName"),
        username: f.get("username"),
        email: f.get("email"),
        phone: f.get("phone"),
        password: f.get("password"),
      });
      setMsg(`Superintendent "${res.username}" created. Log out and sign in as them. This developer account will then be disabled.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (msg) return <div className="bg-card/10 p-4 text-sm">{msg}</div>;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div><label className={labelCls}>Full name</label><input name="fullName" required className={inputCls} /></div>
      <div><label className={labelCls}>Username</label><input name="username" required className={inputCls} /></div>
      <div><label className={labelCls}>Email</label><input name="email" type="email" required className={inputCls} /></div>
      <div><label className={labelCls}>Phone</label><input name="phone" required className={inputCls} /></div>
      <div className="sm:col-span-2"><label className={labelCls}>Password</label><input name="password" type="password" required className={inputCls} /></div>
      {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create Superintendent"}</button></div>
    </form>
  );
}
