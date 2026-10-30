export default function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white/10 font-medium text-white/70 ${className}`}
    >
      {initials}
    </span>
  );
}
