import { FIRST_AID_MANUAL_URL } from "@/lib/resources";

export default function FirstAidManual() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gold/30 bg-card p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-gold">First Aid</p>
        <h2 className="mt-1 text-xl font-light">First Aid manual</h2>
        <p className="mt-1 text-sm text-white/60">The division First Aid reference. It opens in Google Drive.</p>
      </div>
      <a
        href={FIRST_AID_MANUAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
      >
        Open manual
      </a>
    </section>
  );
}
