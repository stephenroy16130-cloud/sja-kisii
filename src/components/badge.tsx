import { BADGE_SRC } from "@/lib/brand";

export default function Badge({ size = 48, bare = false }: { size?: number; bare?: boolean }) {
  const inner = bare ? size : Math.round(size * 0.8);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BADGE_SRC}
      alt="St. John Ambulance badge"
      width={inner}
      height={inner}
      style={{ width: inner, height: inner }}
      className="object-contain"
    />
  );
  if (bare) return img;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-white"
      style={{ width: size, height: size }}
    >
      {img}
    </span>
  );
}
