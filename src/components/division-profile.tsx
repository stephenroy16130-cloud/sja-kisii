import { DIVISION } from "@/lib/division";

export default function DivisionProfile() {
  return (
    <section className="rounded-3xl border border-gold/30 bg-card p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Who we are</p>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="heading accent-bar text-sm">Our mission</h2>
          <p className="font-copy mt-3 text-sm leading-relaxed text-white/80">{DIVISION.mission}</p>
        </div>
        <div>
          <h2 className="heading accent-bar text-sm">Our vision</h2>
          <p className="font-copy mt-3 text-sm leading-relaxed text-white/80">{DIVISION.vision}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <h2 className="heading accent-bar text-sm">Core values</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {DIVISION.values.map((v) => (
            <span
              key={v}
              className="rounded-full border border-gold/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] text-white/80"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
