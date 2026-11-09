"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import PasswordInput from "@/components/password-input";
import { api } from "@/lib/client";
import { btnCls, labelCls } from "@/lib/ui";

export default function ChangeForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    if (f.get("next") !== f.get("confirm")) return setError("The two new passwords do not match");
    setBusy(true);
    try {
      await api("/api/auth/change-password", "POST", { current: f.get("current"), next: f.get("next") });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>{forced ? "Temporary password" : "Current password"}</label>
        <PasswordInput name="current" autoComplete="current-password" />
      </div>
      <div>
        <label className={labelCls}>New password</label>
        <PasswordInput name="next" autoComplete="new-password" />
        <p className="mt-1 text-xs text-white/50">
          At least 8 characters with an uppercase letter, a lowercase letter and a number.
        </p>
      </div>
      <div>
        <label className={labelCls}>Confirm new password</label>
        <PasswordInput name="confirm" autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button disabled={busy} className={btnCls}>{busy ? "Saving..." : "Save new password"}</button>
    </form>
  );
}
