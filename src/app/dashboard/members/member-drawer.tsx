"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/avatar";
import TrophyBadge from "@/components/trophy-badge";
import { crewColor, crewName } from "@/lib/crews";
import { GENDER_LABEL, ID_LABEL } from "@/lib/profile";

type Kinds = "MEETING" | "FIELD_OP" | "TRAINING";
type Counts = Record<Kinds, Record<"PRESENT" | "ABSENT" | "EXCUSED", number>>;
type Detail = {
  official: {
    fullName: string; dateOfBirth: string | null; age: number | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null; phone: string; email: string;
    idType: "NATIONAL_ID" | "BIRTH_CERTIFICATE" | null; idNumber: string | null;
    photo: string | null; status: string; joinedAt: string;
  };
  social: {
    preferredName: string | null; displayName: string; photo: string | null;
    crewId: number | null; trophies: number; titles: string[]; isSuperintendent: boolean;
  };
  activity: {
    counts: Counts; rate: number | null;
    week: { points: number; rank: number | null };
    wins: { weekLabel: string; points: number }[];
  };
};

const KIND_LABEL: Record<Kinds, string> = { MEETING: "Meetings", FIELD_OP: "Field operations", TRAINING: "Training" };
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-KE", { dateStyle: "medium", timeZone: "UTC" });

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 text-sm last:border-0">
      <span className="text-white/50">{label}</span>
      {value ? <span className="break-all text-right">{value}</span> : <span className="text-warn">Not provided</span>}
    </div>
  );
}

export default function MemberDrawer({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [tab, setTab] = useState<"official" | "social">("official");
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/admin/members/${memberId}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Could not load this member");
        setData(j as Detail);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e instanceof Error ? e.message : "Error");
      });
    return () => ctl.abort();
  }, [memberId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShown(false);
        setTimeout(onClose, 250);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function close() {
    setShown(false);
    setTimeout(onClose, 250);
  }

  const pill = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2.5 text-xs transition ${active ? "bg-white text-black" : "text-white/60 hover:text-white"}`;

  return (
    <>
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/10 bg-card p-6 transition-transform duration-300 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Member record</p>
          <button onClick={close} aria-label="Close" className="text-3xl leading-none text-white/50 hover:text-white">
            ×
          </button>
        </div>

        <div className="mb-6 flex rounded-full border border-white/15 p-1">
          <button onClick={() => setTab("official")} className={pill(tab === "official")}>Official Details</button>
          <button onClick={() => setTab("social")} className={pill(tab === "social")}>Activity / Social</button>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}
        {!data && !error && <p className="text-sm text-white/50">Loading...</p>}

        {data && tab === "official" && (
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Avatar name={data.official.fullName} src={data.official.photo} size={72} />
              <div>
                <p className="text-lg font-medium uppercase tracking-wide">{data.official.fullName}</p>
                <p className="mt-1 text-xs capitalize text-white/50">{data.official.status.toLowerCase()}</p>
              </div>
            </div>
            <Row label="Date of birth" value={data.official.dateOfBirth ? fmtDate(data.official.dateOfBirth) : null} />
            <Row label="Age" value={data.official.age !== null ? String(data.official.age) : null} />
            <Row label="Gender" value={data.official.gender ? GENDER_LABEL[data.official.gender] : null} />
            <Row label="Phone" value={data.official.phone} />
            <Row label="Email" value={data.official.email} />
            <Row label="Identity document" value={data.official.idType ? ID_LABEL[data.official.idType] : null} />
            <Row label="ID number" value={data.official.idNumber} />
            <Row label="Joined" value={fmtDate(data.official.joinedAt)} />
            <p className="mt-5 text-[11px] text-white/35">Opening these details is recorded in the audit log.</p>
          </div>
        )}

        {data && tab === "social" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={data.social.displayName} src={data.social.photo} size={72} />
              <div>
                <p className="flex items-center gap-3 text-lg font-light">
                  {data.social.displayName}
                  <TrophyBadge count={data.social.trophies} size={32} />
                </p>
                {data.social.crewId && (
                  <p className="mt-1 flex items-center gap-2 text-xs text-white/50">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(data.social.crewId) }} />
                    {crewName(data.social.crewId)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-light">{data.social.trophies}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Trophies</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-light">{data.activity.week.points}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Pts this week{data.activity.week.rank ? ` · #${data.activity.week.rank}` : ""}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-light">
                  {data.activity.rate === null ? "-" : `${Math.round(data.activity.rate * 100)}%`}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Attendance</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">Attendance record</p>
              {(Object.keys(KIND_LABEL) as Kinds[]).map((k) => (
                <div key={k} className="flex items-center justify-between border-b border-white/10 py-3 text-sm last:border-0">
                  <span>{KIND_LABEL[k]}</span>
                  <span className="text-white/60">
                    <span className="text-ok">{data.activity.counts[k].PRESENT}</span> present ·{" "}
                    <span className="text-bad">{data.activity.counts[k].ABSENT}</span> absent ·{" "}
                    <span className="text-warn">{data.activity.counts[k].EXCUSED}</span> excused
                  </span>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">Roles</p>
              <p className="text-sm text-white/70">
                {[...(data.social.isSuperintendent ? ["Superintendent"] : []), ...data.social.titles.map((t) => t.replace(/_/g, " "))].join(" · ") || "Member"}
              </p>
            </div>

            {data.activity.wins.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">Weeks won</p>
                <ul className="space-y-1.5 text-sm text-white/70">
                  {data.activity.wins.map((w) => (
                    <li key={w.weekLabel} className="flex justify-between">
                      <span>{w.weekLabel}</span>
                      <span className="text-gold">{w.points} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
