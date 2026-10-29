import TrophyBadge from "./trophy-badge";

export default function TrophyCase({
  wins,
  history,
  week,
}: {
  wins: number;
  history: { weekLabel: string; points: number }[];
  week: { points: number; rank: number | null; perfect: boolean };
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Trophy case</p>
      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-5">
          <TrophyBadge count={wins} size={72} muted={wins === 0} />
          <div>
            <p className="text-xl font-light">
              {wins === 0 ? "No trophies yet" : `Member of the Week ${wins === 1 ? "once" : `${wins} times`}`}
            </p>
            <p className="mt-1 max-w-xs text-sm text-white/50">
              {wins === 0
                ? "Attend meetings, field operations and trainings to earn points."
                : "Lifetime wins, kept even if your leadership role changes."}
            </p>
          </div>
        </div>

        <div className="flex-1 rounded-2xl bg-white/5 p-4 sm:ml-4">
          <p className="text-xs text-white/50">This week</p>
          <p className="mt-1 text-2xl font-light">
            {week.points} <span className="text-sm text-white/40">pts</span>
          </p>
          <p className="mt-1 text-xs text-white/50">
            {week.rank ? `Rank #${week.rank} on the board` : "Not on the board yet"}
            {week.perfect && <span className="ml-2 text-ok">Perfect week bonus</span>}
          </p>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs text-white/50">Weeks won</p>
          <ul className="space-y-1.5 text-sm text-white/70">
            {history.map((h) => (
              <li key={h.weekLabel} className="flex justify-between">
                <span>{h.weekLabel}</span>
                <span className="text-gold">{h.points} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
