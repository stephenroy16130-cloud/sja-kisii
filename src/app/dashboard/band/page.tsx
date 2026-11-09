import Link from "next/link";
import { redirect } from "next/navigation";
import EventArchiveButton from "@/components/event-archive-button";
import { getCurrentUser } from "@/lib/auth";
import { BAND_TITLES, canManageInventory, canSeeBand, inBand } from "@/lib/band";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { BAND_POINTS } from "@/lib/points";
import CreateBandSessionForm from "./create-band-session-form";

export const dynamic = "force-dynamic";

const select = { id: true, title: true, heldAt: true, qrToken: true } as const;
type S = { id: string; title: string; heldAt: Date; qrToken: string | null };

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";
const box = "rounded-2xl border border-white/10 bg-card p-5";
const empty = "rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50";

function Row({
  s, present, absent, manage, now, archived = false,
}: {
  s: S; present: number; absent: number; manage: boolean; now: Date; archived?: boolean;
}) {
  const past = s.heldAt < now;
  return (
    <div className={`${box} ${archived ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/dashboard/training/${s.id}`} className="min-w-0 flex-1">
          <p className="text-lg font-light">{s.title}</p>
          <p className="mt-1 text-sm text-white/60">{fmt(s.heldAt)}</p>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!archived && present + absent > 0 && (
            <span className={`${chip} border-white/20 text-white/70`}>
              <span className="text-ok">{present}</span> present · <span className="text-bad">{absent}</span> absent
            </span>
          )}
          {manage && !archived && s.qrToken && (
            <Link href={`/qr/training/${s.id}`} target="_blank" className={`${chip} border-gold/50 text-gold`}>
              Print QR
            </Link>
          )}
          {manage && archived && <EventArchiveButton kind="training" id={s.id} title={s.title} archived />}
          {manage && !archived && past && <EventArchiveButton kind="training" id={s.id} title={s.title} archived={false} />}
        </div>
      </div>
    </div>
  );
}

export default async function BandPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canSeeBand(user)) redirect("/dashboard");

  const manage = canManageInventory(user); // the Band Lead and DO Training
  const member = inBand(user);
  const now = new Date();

  const [sessions, archived, mine, roster] = await Promise.all([
    db.training.findMany({ where: { type: "BAND", archivedAt: null }, orderBy: { heldAt: "desc" }, take: 60, select }),
    manage
      ? db.training.findMany({ where: { type: "BAND", archivedAt: { not: null } }, orderBy: { heldAt: "desc" }, take: 30, select })
      : Promise.resolve([] as S[]),
    member
      ? db.attendanceRecord.groupBy({
          by: ["status"],
          where: { userId: user.id, eventType: "TRAINING", training: { type: "BAND", status: "VERIFIED" } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    manage
      ? db.user.findMany({
          where: { status: "ACTIVE", isDeveloper: false, titles: { hasSome: BAND_TITLES } },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, crewId: true, titles: true },
        })
      : Promise.resolve([]),
  ]);

  const ids = sessions.map((s) => s.id);
  const [att, rosterAtt] = await Promise.all([
    ids.length
      ? db.attendanceRecord.groupBy({ by: ["trainingId", "status"], where: { trainingId: { in: ids } }, _count: { _all: true } })
      : Promise.resolve([]),
    roster.length
      ? db.attendanceRecord.groupBy({
          by: ["userId", "status"],
          where: { userId: { in: roster.map((r) => r.id) }, eventType: "TRAINING", training: { type: "BAND", status: "VERIFIED" } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const count = (id: string, st: string) => att.find((a) => a.trainingId === id && a.status === st)?._count._all ?? 0;
  const upcoming = sessions.filter((s) => s.heldAt >= now).reverse();
  const past = sessions.filter((s) => s.heldAt < now);

  const myPresent = mine.find((m) => m.status === "PRESENT")?._count._all ?? 0;
  const myAbsent = mine.find((m) => m.status === "ABSENT")?._count._all ?? 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Band</h1>
        <p className="mt-1 text-sm text-white/50">
          Practice attendance. Each practice earns {BAND_POINTS} band points, which only break ties for Member of the Week.
        </p>
      </div>

      {member && (
        <section className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-2xl font-light text-ok">{myPresent}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Practices attended</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-2xl font-light">
              {myPresent + myAbsent > 0 ? `${Math.round((myPresent / (myPresent + myAbsent)) * 100)}%` : "-"}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Attendance</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-2xl font-light text-gold">{myPresent * BAND_POINTS}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Band points</p>
          </div>
        </section>
      )}

      {manage && (
        <section>
          <h2 className="mb-4 text-xl font-light">New practice</h2>
          <CreateBandSessionForm />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-light">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className={empty}>No practice scheduled.</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <Row key={s.id} s={s} present={count(s.id, "PRESENT")} absent={count(s.id, "ABSENT")} manage={manage} now={now} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Past practices</h2>
          <div className="space-y-3">
            {past.map((s) => (
              <Row key={s.id} s={s} present={count(s.id, "PRESENT")} absent={count(s.id, "ABSENT")} manage={manage} now={now} />
            ))}
          </div>
        </section>
      )}

      {manage && (
        <section>
          <h2 className="mb-4 text-xl font-light">Band roster ({roster.length})</h2>
          {roster.length === 0 ? (
            <div className={empty}>No band members yet. The Superintendent gives the Band Member title in People.</div>
          ) : (
            <div className="space-y-3">
              {roster.map((m) => {
                const p = rosterAtt.find((a) => a.userId === m.id && a.status === "PRESENT")?._count._all ?? 0;
                const a = rosterAtt.find((x) => x.userId === m.id && x.status === "ABSENT")?._count._all ?? 0;
                return (
                  <div key={m.id} className={`${box} flex flex-wrap items-center justify-between gap-3`}>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wide">{m.fullName}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-white/50">
                        {m.crewId && (
                          <>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(m.crewId) }} />
                            {crewName(m.crewId)}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {m.titles.includes("BAND_LEAD") && <span className={`${chip} border-gold/50 text-gold`}>Band Lead</span>}
                      <span className={`${chip} border-white/20 text-white/60`}>
                        {p + a > 0 ? `${p} of ${p + a} · ${Math.round((p / (p + a)) * 100)}%` : "No practices yet"}
                      </span>
                      <span className={`${chip} border-white/20 text-gold`}>{p * BAND_POINTS} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {manage && archived.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xl font-light text-white/60 hover:text-white">
            Archived ({archived.length})
          </summary>
          <div className="mt-4 space-y-3">
            {archived.map((s) => (
              <Row key={s.id} s={s} present={0} absent={0} manage={manage} now={now} archived />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
