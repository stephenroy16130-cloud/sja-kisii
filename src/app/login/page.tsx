"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/auth-shell";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/auth/login", "POST", {
        identifier: f.get("identifier"),
        password: f.get("password"),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in with your username or email.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Username or email</label>
          <input name="identifier" required autoComplete="username" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className={btnCls}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-neutral-500">
        <Link href="/forgot-password" className="hover:text-black">Forgot password?</Link>
        <Link href="/register" className="hover:text-black">Create account</Link>
      </div>
    </AuthShell>
  );
}
