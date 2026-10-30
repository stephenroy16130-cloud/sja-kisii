import { crewColor, crewName } from "@/lib/crews";
import Avatar from "./avatar";
import TrophyBadge from "./trophy-badge";

export type HallEntry = {
  userId: string;
  name: string;
  photo: string | null;
  crewId: number | null;
  points: number;
  wins: number;
};
export type HallData = {
  weekLabel: string;
  leaders: HallEntry[];
  last: (HallEntry & { weekLabel: string }) | null;
};

function CrewTag({ id }: { id: number | null }) {
  if (!id) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(id) }} />
      {crewName(id)}
    </span>
  );
}

export default function HallOfFame({ data, meId }: { data: HallData; meId: string }) {
  const [first, ...rest] = data.leaders;
  return (
    <section className="vignette-dark relative overflow-hidden rounded-3xl border border-gold/30 p-6 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Hall of Fame</p>
          <h2 className="mt-1 text-2xl font-light">Member of the Week</h2>
        </div>
        <p className="text-xs text-white/40">{data.weekLabel}</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs text-white/50">Leading this week</p>
          {first ? (
            <div className="mt-3 flex items-center gap-4">
              <Avatar name={first.name} src={first.photo} size={56} />
              <div>
                <p className="flex items-center gap-3 text-xl font-light">
                  {first.name}
                  <TrophyBadge count={first.wins} size={34} />
                  {first.userId === meId && <span className="text-xs text-gold">You</span>}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-gold">{first.points} pts</span>
                  <CrewTag id={first.crewId} />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/50">No attendance recorded yet this week. Be the first on the board.</p>
          )}

          {rest.length > 0 && (
            <ol className="mt-5 space-y-2">
              {rest.map((r, i) => (
                <li key={r.userId} className="flex items-center justify-between gap-3 text-sm text-white/70">
                  <span className="flex items-center gap-3">
                    <span className="w-4 text-white/40">{i + 2}</span>
                    <Avatar name={r.name} src={r.photo} size={28} />
                    {r.name}
                    {r.userId === meId && <span className="text-xs text-gold">You</span>}
                    <TrophyBadge count={r.wins} size={22} />
                  </span>
                  <span className="text-white/50">{r.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-white/10 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="text-xs text-white/50">Last crowned</p>
          {data.last ? (
            <div className="mt-3 flex items-center gap-4">
              <Avatar name={data.last.name} src={data.last.photo} size={56} />
              <div>
                <p className="flex items-center gap-3 text-lg font-light">
                  {data.last.name}
                  <TrophyBadge count={data.last.wins} size={30} />
                  {data.last.userId === meId && <span className="text-xs text-gold">You</span>}
                </p>
                <p className="mt-1 text-sm text-white/50">
                  {data.last.points} pts · {data.last.weekLabel}
                </p>
                <div className="mt-1">
                  <CrewTag id={data.last.crewId} />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/50">No winner crowned yet.</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-white/35">
        Meeting 10 pts · Field Ops 15 · Training 10 · +5 for a perfect week. The week runs Monday to Sunday.
      </p>
    </section>
  );
}
