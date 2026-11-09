import { EMERGENCY } from "@/lib/contact";

function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

// Compact: a small pill for the phone's top bar. Full: a card for side panels and forms.
export default function EmergencyLine({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const href = `tel:${EMERGENCY.tel}`;
  const aria = `Call the ${EMERGENCY.label}, ${EMERGENCY.display}`;

  if (compact) {
    return (
      <a
        href={href}
        aria-label={aria}
        className={`flex shrink-0 items-center gap-2 rounded-full border border-bad/60 px-3 py-1.5 text-bad ${className}`}
      >
        <PhoneIcon />
        <span className="flex flex-col leading-tight">
          <span className="text-[8px] uppercase tracking-[0.15em]">Emergency</span>
          <span className="text-xs font-medium">{EMERGENCY.display}</span>
        </span>
      </a>
    );
  }

  return (
    <div className={`rounded-2xl border border-bad/40 p-4 text-left ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-bad">St. John Ambulance emergency</p>
      <a href={href} aria-label={aria} className="mt-1 flex items-center gap-2 text-lg text-white transition hover:text-bad">
        <PhoneIcon size={18} />
        {EMERGENCY.display}
      </a>
      <p className="mt-1 text-[11px] text-white/40">Tap to call</p>
    </div>
  );
}
