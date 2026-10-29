import { crewColor, crewName } from "@/lib/crews";

const chip = "inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70";

export default function CrewTargets({ allCrews, crewIds }: { allCrews: boolean; crewIds: number[] }) {
  if (allCrews) return <span className={chip}>All crews</span>;
  return (
    <>
      {[...crewIds]
        .sort((a, b) => a - b)
        .map((id) => (
          <span key={id} className={chip}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(id) }} />
            {crewName(id)}
          </span>
        ))}
    </>
  );
}
