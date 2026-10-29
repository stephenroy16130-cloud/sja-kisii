"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

type Status = "PENDING" | "APPROVED" | "REJECTED";
const word = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Declined" } as const;
const tone = {
  PENDING: "border-warn/50 text-warn",
  APPROVED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
} as const;

export default function ApologyForm({
  meetingId,
  locked,
  existing,
}: {
  meetingId: string;
  locked: boolean;
  existing: { status: Status; reason: string } | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/meetings/${meetingId}/apology`, "POST", { reason: f.get("reason") });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  const status = (
    <>
      {existing && (
        <div className="mb-4">
          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${tone[existing.status]}`}>
            {word[existing.status]}
          </span>
          <p className="mt-3 text-sm text-white/60">&ldquo;{existing.reason}&rdquo;</p>
        </div>
      )}
    </>
  );

  if (existing && existing.status !== "PENDING") return status;

  if (locked) {
    return (
      <>
        {status}
        <p className="text-sm text-white/50">
          {existing ? "Apologies are now closed, so this can no longer be edited." : "Apologies are closed for this meeting."}
        </p>
      </>
    );
  }

  return (
    <>
      {status}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>{existing ? "Update your reason" : "Reason for your apology"}</label>
          <textarea
            name="reason"
            rows={3}
            required
            minLength={5}
            defaultValue={existing?.reason ?? ""}
            className={inputCls}
          />
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button disabled={busy} className={btnCls}>
          {busy ? "Sending..." : existing ? "Update apology" : "Request apology"}
        </button>
      </form>
    </>
  );
}
