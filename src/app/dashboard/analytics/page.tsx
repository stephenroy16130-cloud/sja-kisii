import { redirect } from "next/navigation";
import { GroupedBars, StackedBars } from "@/components/charts";
import { attendanceAnalytics, bandAnalytics, financeAnalytics, shortDate, trainingAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { canManageInventory } from "@/lib/band";
import { crewColor, crewName } from "@/lib/crews";
import { isLeader } from "@/lib/leaderboard";
import { can } from "@/lib/rbac";
import { kes } from "@/lib/store";
import { typeLabel } from "@/lib/training";

export const dynamic = "force-dynamic";

const card = "rounded-3xl border border-white/10 bg-card p-6 md:p-8";
const eyebrow = "text-[11px] uppercase tracking-[0.25em] text-gold";
const pct = (v: number | null) => (v === null ? "-" : `${Math.round(v * 100)}%`);

function Tile({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className={`text-2xl font-light ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isLeader(user)) redirect("/dashboard");

  const all = can(user, "user:manage_accounts");
  const ownCrew = can(user, "crew:record_attendance") ? user.crewId : null;

  const [att, fin, trn, band] = await Promise.all([
    attendanceAnalytics({ all, crewId: ownCrew }),
    can(user, "finance:manage") ? financeAnalytics() : Promise.resolve(null),
    can(user, "training:verify") ? trainingAnalytics() : Promise.resolve(null),
    canManageInventory(user) ? bandAnalytics() : Promise.resolve(null),
  ]);
  const labels = att.weeks.map(shortDate);
  const showRisk = all || ownCrew !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-white/50">Trends over the last 8 weeks. Excused absences are never counted.</p>
      </div>

      <section className={card}>
        <p className={eyebrow}>Attendance</p>
        <h2 className="mt-1 text-2xl font-light">Crews, week by week</h2>
        <p className="mb-6 mt-1 text-xs text-white/40">Meetings, field operations and verified training. Top of the chart is 100%.</p>
        <GroupedBars
          labels={labels}
          series={att.crews.map((c) => ({ name: crewName(c.crewId), color: crewColor(c.crewId), values: c.rates }))}
        />
        <div className="mt-6 divide-y divide-white/10">
          {att.crews.map((c) => (
            <div key={c.crewId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(c.crewId) }} />
                {crewName(c.crewId)}
              </span>
              <span className="text-white/60">
                <span className="text-white">{pct(c.rate)}</span>
                {c.present + c.absent > 0 && <> · {c.present}/{c.present + c.absent}</>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {showRisk && (
        <section className={card}>
          <p className={eyebrow}>Needs attention</p>
          <h2 className="mt-1 text-2xl font-light">Low attendance, last 30 days</h2>
          <p className="mb-5 mt-1 text-xs text-white/40">
            Under 50% across at least 3 records{all ? "" : " in your crew"}. A prompt for a kind check-in.
          </p>
          {att.atRisk.length === 0 ? (
            <p className="text-sm text-ok">Nobody is below 50%. Well done.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {att.atRisk.map((m) => (
                <div key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="uppercase tracking-wide">
                    {m.name}
                    {m.crewId && <span className="ml-2 text-xs normal-case text-white/40">{crewName(m.crewId)}</span>}
                  </span>
                  <span className="text-warn">
                    {m.present} of {m.total} · {Math.round((m.present / m.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {fin && (
        <section className={card}>
          <p className={eyebrow}>Finance</p>
          <h2 className="mt-1 text-2xl font-light">Collections, week by week</h2>
          <div className="my-5 grid grid-cols-3 gap-3">
            <Tile label="Collected (8 weeks)" value={kes(fin.total)} tone="text-gold" />
            <Tile label="Payments made" value={fin.ok} tone="text-ok" />
            <Tile label="Failed or cancelled" value={fin.notOk} tone={fin.notOk ? "text-warn" : ""} />
          </div>
          <StackedBars
            labels={fin.weeks.map(shortDate)}
            series={[
              { name: "Registration fees", color: "#d4af5a", values: fin.byWeek.map((w) => w.REGISTRATION_FEE) },
              { name: "Shop orders", color: "#3fb5e8", values: fin.byWeek.map((w) => w.STORE_ORDER) },
              { name: "Crew events", color: "#a78bfa", values: fin.byWeek.map((w) => w.CREW_EVENT) },
              { name: "Activity payments", color: "#2fcb8b", values: fin.byWeek.map((w) => w.COLLECTION) },
            ]}
          />
        </section>
      )}

      {trn && (
        <section className={card}>
          <p className={eyebrow}>Training</p>
          <h2 className="mt-1 text-2xl font-light">Last 90 days</h2>
          <div className="my-5 grid grid-cols-2 gap-3">
            <Tile label="Attendance on verified sessions" value={pct(trn.rate)} tone="text-ok" />
            <Tile label="Records counted" value={trn.records} />
          </div>
          <div className="divide-y divide-white/10">
            {trn.table.map((t) => (
              <div key={t.type} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>{typeLabel[t.type]}</span>
                <span className="text-white/60">
                  <span className="text-ok">{t.verified}</span> verified ·{" "}
                  <span className="text-warn">{t.pending}</span> pending ·{" "}
                  <span className="text-bad">{t.rejected}</span> rejected
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {band && (
        <section className={card}>
          <p className={eyebrow}>Band</p>
          <h2 className="mt-1 text-2xl font-light">Instruments</h2>
          <div className="my-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Tile label="Available" value={band.available} tone="text-ok" />
            <Tile label="Issued" value={band.issued} tone="text-gold" />
            <Tile label="Damaged" value={band.damaged} tone={band.damaged ? "text-warn" : ""} />
            <Tile label="Lost" value={band.lost} tone={band.lost ? "text-bad" : ""} />
            <Tile label="Band members" value={band.members} />
          </div>
          {band.longest.length > 0 && (
            <>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">Held the longest</p>
              <div className="divide-y divide-white/10">
                {band.longest.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>
                      {l.instrument} <span className="uppercase tracking-wide text-white/40">· {l.holder}</span>
                    </span>
                    <span className={l.days > 30 ? "text-warn" : "text-white/60"}>{l.days} days</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
