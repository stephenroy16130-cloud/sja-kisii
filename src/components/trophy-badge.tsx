export default function TrophyBadge({
  count,
  size = 40,
  muted = false,
}: {
  count: number;
  size?: number;
  muted?: boolean;
}) {
  if (count <= 0 && !muted) return null;
  return (
    <span
      className={`relative inline-flex shrink-0 ${muted ? "opacity-25 grayscale" : ""}`}
      style={{ width: size, height: size }}
      title={muted ? "No trophies yet" : `Member of the Week x${count}`}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="trophy-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6e08a" />
            <stop offset="1" stopColor="#b8862b" />
          </linearGradient>
        </defs>
        <path d="M14 6h20v10c0 6-4.5 10.5-10 10.5S14 22 14 16z" fill="url(#trophy-gold)" />
        <path
          d="M14 9H8c0 6 2 10 7 11M34 9h6c0 6-2 10-7 11"
          fill="none"
          stroke="#d4af5a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="21.5" y="26" width="5" height="8" fill="url(#trophy-gold)" />
        <rect x="15" y="34" width="18" height="6" rx="1.5" fill="url(#trophy-gold)" />
      </svg>
      {!muted && (
        <span
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-black font-semibold leading-none text-gold ring-2 ring-gold"
          style={{ width: size * 0.46, height: size * 0.46, fontSize: Math.max(9, size * 0.26) }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
