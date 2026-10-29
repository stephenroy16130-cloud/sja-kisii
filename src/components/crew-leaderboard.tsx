import { crewColor, crewName } from "@/lib/crews";
import type { CrewRate } from "@/lib/leaderboard";

export default function CrewLeaderboard({ rows }: { rows: CrewRate[] }) {
  const hasData = rows.some((r) => r.rate !== null);
  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Crew leaderboard</p>
      <h2 className="mt-1 text-2xl font-light">Best attendance</h2>
      <p className="mt-1 text-xs text-white/40">
        Meetings, field operations and verified training over the last 30 days. Excused absences are not counted.
      </p>

      {!hasData ? (
        <p className="mt-6 text-sm text-white/50">No attendance recorded yet.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {rows.map((r, i) => {
            const pct = r.rate === null ? 0 : Math.round(r.rate * 100);
            return (
              <div key={r.crewId}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-3">
                    <span className={`w-5 text-center ${i === 0 && r.rate !== null ? "text-gold" : "text-white/40"}`}>
                      {i + 1}
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: crewColor(r.crewId) }} />
                    {crewName(r.crewId)}
                    {i === 0 && r.rate !== null && (
                      <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-gold">
                        Leading
                      </span>
                    )}
                  </span>
                  <span className="text-white/60">
                    {r.rate === null ? "No records" : <><span className="text-white">{pct}%</span> · {r.present}/{r.present + r.absent}</>}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: crewColor(r.crewId) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
