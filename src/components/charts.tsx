export type RateSeries = { name: string; color: string; values: (number | null)[] };
export type MoneySeries = { name: string; color: string; values: number[] };

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
      {items.map((s) => (
        <span key={s.name} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function Labels({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 flex gap-2">
      {labels.map((l, i) => (
        <span key={l + i} className="flex-1 text-center text-[10px] text-white/40">
          {l}
        </span>
      ))}
    </div>
  );
}

// Attendance rates (0 to 1), one bar per series in each week
export function GroupedBars({ labels, series }: { labels: string[]; series: RateSeries[] }) {
  return (
    <div>
      <div className="relative flex h-44 items-end gap-2 border-b border-white/15">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-white/10" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/10" />
        {labels.map((l, i) => (
          <div key={l + i} className="relative flex h-full flex-1 items-end justify-center gap-[2px]">
            {series.map((s) => {
              const v = s.values[i];
              const none = v === null || v === undefined;
              return (
                <div
                  key={s.name}
                  title={`${s.name}: ${none ? "no records" : Math.round(v * 100) + "%"}`}
                  className="w-full max-w-[10px] rounded-t-sm"
                  style={{
                    height: none ? "2px" : `${Math.max(2, Math.round(v * 100))}%`,
                    backgroundColor: s.color,
                    opacity: none ? 0.25 : 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <Labels labels={labels} />
      <Legend items={series} />
    </div>
  );
}

// Money per week, stacked by type
export function StackedBars({ labels, series }: { labels: string[]; series: MoneySeries[] }) {
  const totals = labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div className="flex h-44 items-end gap-2 border-b border-white/15">
        {labels.map((l, i) => (
          <div key={l + i} className="flex h-full flex-1 items-end justify-center">
            <div
              title={`KES ${totals[i].toLocaleString("en-KE")}`}
              className="flex w-full max-w-[28px] flex-col-reverse overflow-hidden rounded-t-sm"
              style={{ height: totals[i] ? `${Math.max(2, (totals[i] / max) * 100)}%` : "2px", opacity: totals[i] ? 1 : 0.25 }}
            >
              {series.map((s) => (
                <div
                  key={s.name}
                  style={{ height: totals[i] ? `${(s.values[i] / totals[i]) * 100}%` : 0, backgroundColor: s.color }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Labels labels={labels} />
      <Legend items={series} />
    </div>
  );
}
