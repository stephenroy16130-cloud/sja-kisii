import Badge from "./badge";

// Shown while the app opens and while pages load: the badge, with three animated dots on mobile/small screens or a moving bar on large screens
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

      {/* Mobile and small screens only: 3-dot animation just below the badge */}
      <div className="mt-4 flex items-center justify-center gap-2 lg:hidden" aria-hidden="true">
        <span className="sja-dot h-2 w-2 rounded-full bg-gold" style={{ animationDelay: "0ms" }} />
        <span className="sja-dot h-2 w-2 rounded-full bg-gold" style={{ animationDelay: "200ms" }} />
        <span className="sja-dot h-2 w-2 rounded-full bg-gold" style={{ animationDelay: "400ms" }} />
      </div>

      {/* Large screens: moving bar */}
      <div className="mt-8 hidden h-[3px] w-32 overflow-hidden rounded-full bg-white/10 lg:block">
        <div className="sja-bar h-full w-1/3 rounded-full bg-gold" />
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-white/40">Loading</p>
    </div>
  );
}
