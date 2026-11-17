import { personalInsights } from "@/lib/attendance-insights";
import { pctOf, ProgressBar, Ring, WeeklyBars } from "./attendance-charts";

export default async function AttendanceInsights({ userId }: { userId: string }) {
  const d = await personalInsights(userId);
  const pct = pctOf(d.present, d.total);

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Your progress</p>

      {d.total === 0 ? (
        <p className="mt-3 text-sm text-white/50">
          Your attendance will show up here once a leader has recorded it at a meeting, field operation or training.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
            <div className="flex items-center gap-6">
              <Ring pct={pct}>
                <span className="text-3xl font-light tabular-nums">{pct}%</span>
              </Ring>
              <div>
                <p className="text-3xl font-light tabular-nums">
                  <span className="text-gold">{d.present}</span> of {d.total}
                </p>
                <p className="text-sm text-white/60">events attended</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em]">
                  <span className="rounded-full border border-white/20 px-3 py-1 text-white/70">
                    Streak {d.streak}
                  </span>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-white/70">Best {d.best}</span>
                  {d.excused > 0 && (
                    <span className="rounded-full border border-white/20 px-3 py-1 text-white/40">{d.excused} excused</span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full flex-1 space-y-4">
              {d.kinds
                .filter((k) => k.total > 0 || k.kind !== "BAND")
                .map((k) => (
                  <ProgressBar key={k.kind} label={k.label} present={k.present} total={k.total} />
                ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="mb-4 text-sm">Last 8 weeks</p>
            <WeeklyBars weeks={d.weeks} />
          </div>
        </>
      )}
    </section>
  );
}
