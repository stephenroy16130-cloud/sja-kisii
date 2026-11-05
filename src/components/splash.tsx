import Badge from "./badge";

// Shown while the app opens and while pages load: the badge, with a moving bar under it
export default function Splash({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center bg-black ${compact ? "min-h-[50vh]" : "min-h-screen"}`}
    >
      <div className="sja-pulse rounded-full">
        <Badge size={compact ? 72 : 96} />
      </div>
      <div className="mt-8 h-[3px] w-32 overflow-hidden rounded-full bg-white/10">
        <div className="sja-bar h-full w-1/3 rounded-full bg-gold" />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-white/40">Loading</p>
    </div>
  );
}
