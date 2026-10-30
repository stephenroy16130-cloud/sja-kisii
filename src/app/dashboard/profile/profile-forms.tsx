"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Avatar from "@/components/avatar";
import PhotoUploader from "@/components/photo-uploader";
import TrophyBadge from "@/components/trophy-badge";
import { api } from "@/lib/client";
import { crewColor, crewName } from "@/lib/crews";
import { calcAge } from "@/lib/profile";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

type Official = {
  fullName: string; dateOfBirth: string; gender: string; phone: string; email: string;
  idType: string; idNumber: string; photo: string | null;
};
type Social = { fullName: string; preferredName: string; photo: string | null; crewId: number | null; trophies: number };

function OfficialForm({ data }: { data: Official }) {
  const router = useRouter();
  const [dob, setDob] = useState(data.dateOfBirth);
  const [idType, setIdType] = useState(data.idType);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const born = dob ? new Date(dob + "T00:00:00Z") : null;
  const age = born && !Number.isNaN(born.getTime()) ? calcAge(born) : null;
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/profile/official", "PUT", {
        fullName: f.get("fullName"),
        dateOfBirth: dob,
        gender: f.get("gender"),
        phone: f.get("phone"),
        email: f.get("email"),
        idType,
        idNumber: f.get("idNumber"),
      });
      setMsg("Official profile saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm text-white/70">
        Private. Only you and the DO Admin can see these details. Other members never can.
      </div>

      <div>
        <label className={labelCls}>Official photo</label>
        <PhotoUploader kind="OFFICIAL" src={data.photo} name={data.fullName} />
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Full name</label>
          <input name="fullName" required defaultValue={data.fullName} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date of birth{age !== null && age >= 0 ? ` · Age ${age}` : ""}</label>
          <input type="date" required max={today} value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Gender</label>
          <select name="gender" required defaultValue={data.gender} className={inputCls}>
            <option value="" disabled>Choose</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Phone number</label>
          <input name="phone" required defaultValue={data.phone} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" type="email" required defaultValue={data.email} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Identity document</label>
          <select required value={idType} onChange={(e) => setIdType(e.target.value)} className={inputCls}>
            <option value="" disabled>Choose</option>
            <option value="NATIONAL_ID">National ID</option>
            <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{idType === "BIRTH_CERTIFICATE" ? "Birth certificate number" : "National ID number"}</label>
          <input
            name="idNumber"
            required
            defaultValue={data.idNumber}
            placeholder={idType === "BIRTH_CERTIFICATE" ? "Certificate number" : "8 digits"}
            className={inputCls}
          />
        </div>
        {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
        {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
        <div className="sm:col-span-2">
          <button disabled={busy} className={btnCls}>{busy ? "Saving..." : "Save official profile"}</button>
        </div>
      </form>
    </div>
  );
}

function SocialForm({ data }: { data: Social }) {
  const router = useRouter();
  const [nick, setNick] = useState(data.preferredName);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = nick.trim() || data.fullName;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await api("/api/profile/social", "PUT", { preferredName: nick });
      setMsg("Social profile saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-card p-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">How other members see you</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={shown} src={data.photo} size={56} />
          <div>
            <p className="flex items-center gap-3 text-lg font-light">
              {shown}
              <TrophyBadge count={data.trophies} size={30} />
            </p>
            {data.crewId && (
              <p className="mt-1 flex items-center gap-2 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(data.crewId) }} />
                {crewName(data.crewId)}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-white/40">
          Your date of birth, ID, phone and email are never shown here. Your crew is set by your leaders. Trophies are
          earned as Member of the Week.
        </p>
      </div>

      <div>
        <label className={labelCls}>Social photo</label>
        <PhotoUploader kind="SOCIAL" src={data.photo} name={shown} />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Preferred name (optional)</label>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={30}
            placeholder="A nickname others will see"
            className={inputCls}
          />
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        {msg && <p className="text-sm text-ok">{msg}</p>}
        <button disabled={busy} className={btnCls}>{busy ? "Saving..." : "Save social profile"}</button>
      </form>
    </div>
  );
}

export default function ProfileForms({ official, social }: { official: Official; social: Social }) {
  const [tab, setTab] = useState<"official" | "social">("official");
  const pill = (active: boolean) =>
    `flex-1 rounded-full px-5 py-2.5 text-sm transition ${active ? "bg-white text-black" : "text-white/60 hover:text-white"}`;

  return (
    <div>
      <div className="mb-6 flex rounded-full border border-white/15 p-1">
        <button type="button" onClick={() => setTab("official")} className={pill(tab === "official")}>Official</button>
        <button type="button" onClick={() => setTab("social")} className={pill(tab === "social")}>Social</button>
      </div>
      {tab === "official" ? <OfficialForm data={official} /> : <SocialForm data={social} />}
    </div>
  );
}
