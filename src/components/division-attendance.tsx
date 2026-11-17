import { divisionInsights, KIND_WORD } from "@/lib/attendance-insights";
import { crewColor, crewName } from "@/lib/crews";
import { pctOf, ProgressBar, WeeklyBars } from "./attendance-charts";

export default async function DivisionAttendance({ crewId, scope }: { crewId: number | null; scope: string }) {
  const d = await divisionInsights(crewId);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Attendance in detail</p>
        <h2 className="mt-1 text-2xl font-light">{scope}</h2>
        <p className="mt-1 text-sm text-white/50">Each bar shows how many recorded places were filled. Last 30 days, unless stated.</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-card p-6">
        <ProgressBar label="Overall, last 30 days" present={d.overall.present} total={d.overall.total} />
        {d.overall.total > 0 && (
          <p className="mt-3 text-xs text-white/40">{pctOf(d.overall.present, d.overall.total)}% of recorded attendances were present.</p>
        )}
      </div>

      {crewId === null && (
        <div className="rounded-3xl border border-white/10 bg-card p-6">
          <p className="mb-4 text-sm">By crew</p>
          <div className="space-y-4">
            {d.crews.map((c) => (
              <ProgressBar key={c.crewId} label={crewName(c.crewId)} present={c.present} total={c.total} dot={crewColor(c.crewId)} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-card p-6">
        <p className="mb-4 text-sm">By type of event</p>
        <div className="space-y-4">
          {d.kinds
            .filter((k) => k.total > 0 || k.kind !== "BAND")
            .map((k) => (
              <ProgressBar key={k.kind} label={KIND_WORD[k.kind]} present={k.present} total={k.total} />
            ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-card p-6">
        <p className="mb-4 text-sm">Weekly trend, last 8 weeks</p>
        <WeeklyBars weeks={d.weeks} />
      </div>

      <div className="rounded-3xl border border-white/10 bg-card p-6">
        <p className="mb-4 text-sm">Latest events</p>
        {d.recent.length === 0 ? (
          <p className="text-sm text-white/50">No attendance recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {d.recent.map((e, i) => (
              <ProgressBar key={i} label={e.title} present={e.present} total={e.total} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
