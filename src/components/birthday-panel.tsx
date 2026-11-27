"use client";

import Link from "next/link";
import { useState } from "react";

type Person = { id: string; name: string; crew: string; color: string; count: number; wished: boolean };
type Wish = { id: string; fromId: string; from: string; message: string; at: string };
type Me = {
  id: string;
  firstName: string;
  fullName: string;
  crew: string;
  color: string;
  hasDob: boolean;
  celebrating: boolean;
  wishes: Wish[];
};

const PRESETS = [
  "Happy birthday! Have a wonderful day.",
  "Heri ya siku ya kuzaliwa! Mungu akubariki.",
  "Many happy returns! God bless you.",
  "Wishing you a great year ahead. Enjoy your day!",
  "Happy birthday to a great teammate!",
];

const GOLD_RING = "linear-gradient(135deg,#f1dc8a,#d4af37 50%,#8a6d1a)";

// Soft effects only: a slow shimmer, a fade-up, a gentle glow and a small bob
const CSS = `
@keyframes bday-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
@keyframes bday-sheen { 0% { transform: translateX(-130%) } 60%, 100% { transform: translateX(380%) } }
@keyframes bday-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,.45) } 50% { box-shadow: 0 0 0 8px rgba(212,175,55,0) } }
@keyframes bday-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
.bday-rise { animation: bday-rise .5s cubic-bezier(.2,.8,.2,1) both }
.bday-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 35%; pointer-events: none; background: linear-gradient(100deg, transparent, rgba(212,175,55,.12), transparent); animation: bday-sheen 7s ease-in-out infinite }
.bday-ring { animation: bday-glow 2.8s ease-in-out infinite }
.bday-bob { animation: bday-bob 2.4s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .bday-rise, .bday-sheen, .bday-ring, .bday-bob { animation: none } }
`;

async function postWish(toUserId: string, message: string): Promise<void> {
  const res = await fetch("/api/birthdays/wish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toUserId, message }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Something went wrong");
  }
}
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

function Avatar({ id, name, size }: { id: string; name: string; size: "sm" | "lg" }) {
  const [ok, setOk] = useState(true);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const dim = size === "lg" ? "h-14 w-14 text-sm" : "h-8 w-8 text-[10px]";
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-800 ${dim}`}>
      {initials}
      {ok && (
        <img src={`/api/photos/${id}/social`} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setOk(false)} />
      )}
    </span>
  );
}

function RingedAvatar({ id, name }: { id: string; name: string }) {
  return (
    <span className="bday-ring block shrink-0 rounded-full p-[2px]" style={{ background: GOLD_RING }}>
      <span className="block rounded-full border-2 border-black">
        <Avatar id={id} name={name} size="lg" />
      </span>
    </span>
  );
}

function CrewPill({ crew, color }: { crew: string; color: string }) {
  if (!crew) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/80">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {crew}
    </span>
  );
}

function Cake() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6c.8-1 .8-2 0-3-.8 1-.8 2 0 3z" />
      <path d="M12 12V9" />
      <path d="M4 20v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M2 20h20" />
      <path d="M4 16c2 1.5 3 1.5 4 0 1 1.5 3 1.5 4 0 1 1.5 3 1.5 4 0 1 1.5 2 1.5 4 0" />
    </svg>
  );
}

export default function BirthdayPanel({ celebrating, me, dateLabel }: { celebrating: Person[]; me: Me; dateLabel: string }) {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendWish(id: string) {
    setBusy(true);
    setError("");
    try {
      await postWish(id, text);
      setSent((s) => ({ ...s, [id]: true }));
      setOpenFor(null);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-gold/30 bg-card p-4 md:p-5"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, rgba(212,175,55,0.14), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(212,175,55,0.06), transparent 65%)",
      }}
    >
      <style>{CSS}</style>
      <div aria-hidden="true" className="bday-sheen" />

      <div className="relative flex items-center gap-3">
        <span className="bday-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 bg-black text-gold">
          <span className="bday-bob">
            <Cake />
          </span>
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">{dateLabel}</p>
          <h2 className="text-lg font-light tracking-tight">Birthdays today</h2>
        </div>
      </div>

      {me.celebrating && (
        <div className="bday-rise relative mt-4 rounded-2xl border border-gold/40 bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <RingedAvatar id={me.id} name={me.fullName} />
            <div className="min-w-0 flex-1">
              <p className="text-xl font-light tracking-tight">Happy birthday, {me.firstName}!</p>
              <p className="mt-0.5 break-words text-xs uppercase tracking-wide text-white/70">{me.fullName}</p>
              <div className="mt-1.5">
                <CrewPill crew={me.crew} color={me.color} />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/55">
            {me.wishes.length === 0
              ? "Wishes from the division will appear here through the day."
              : `${me.wishes.length} ${me.wishes.length === 1 ? "wish" : "wishes"} for you`}
          </p>
          {me.wishes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {me.wishes.map((w) => (
                <li key={w.id} className="flex items-start gap-2.5">
                  <Avatar id={w.fromId} name={w.from} size="sm" />
                  <div className="min-w-0 rounded-2xl rounded-tl-md border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[13px] leading-snug text-white/90">{w.message}</p>
                    <p className="mt-0.5 text-[10px] text-gold/80">
                      {w.from} <span className="text-white/30">· {time(w.at)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {celebrating.length > 0 && (
        <div className={`relative mt-4 grid gap-3 ${celebrating.length > 1 ? "md:grid-cols-2" : ""}`}>
          {celebrating.map((p, i) => {
            const wished = p.wished || sent[p.id];
            const count = p.count + (sent[p.id] && !p.wished ? 1 : 0);
            return (
              <div
                key={p.id}
                className="bday-rise rounded-2xl border border-white/10 bg-black/50 p-3.5 backdrop-blur-sm"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <RingedAvatar id={p.id} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base uppercase leading-tight tracking-wide">{p.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <CrewPill crew={p.crew} color={p.color} />
                      {count > 0 && (
                        <span className="text-[11px] text-gold">
                          {count} {count === 1 ? "wish" : "wishes"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  {wished ? (
                    <p className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-xs text-ok">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                      Wish sent
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenFor(openFor === p.id ? null : p.id);
                        setText("");
                        setError("");
                      }}
                      className="w-full rounded-full bg-gold py-2 text-xs font-medium text-black transition hover:opacity-90"
                    >
                      Send a wish
                    </button>
                  )}
                </div>

                {openFor === p.id && !wished && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setText(m)}
                          className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-gold hover:text-white"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={2}
                      maxLength={200}
                      placeholder="Write your wish..."
                      className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-gold/60"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-white/40">{text.length}/200</span>
                      <button
                        disabled={busy || text.trim().length < 2}
                        onClick={() => void sendWish(p.id)}
                        className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
                      >
                        {busy ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="relative mt-3 text-sm text-bad">{error}</p>}

      {!me.hasDob && (
        <p className="relative mt-4 border-t border-white/10 pt-3 text-xs text-white/40">
          Add your date of birth in{" "}
          <Link href="/dashboard/profile" className="text-gold underline">
            My profile
          </Link>{" "}
          so the division can celebrate with you. Only the day and month are shown.
        </p>
      )}
    </section>
  );
}
