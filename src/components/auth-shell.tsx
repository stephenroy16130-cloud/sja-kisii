import type { ReactNode } from "react";
import Badge from "@/components/badge";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main
      className="relative grid min-h-screen overflow-hidden text-white lg:grid-cols-[1.1fr_0.9fr]"
      style={{
        backgroundColor: "#000",
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 38% 6%, rgba(212,175,90,0.2), transparent 70%), radial-gradient(ellipse 90% 80% at 35% 30%, #2c2c2c 0%, #111 55%, #000 100%)",
      }}
    >
      <div className="pointer-events-none absolute left-[30%] top-1/4 h-[34rem] w-[34rem] rounded-full border border-white/10" />
      <div className="pointer-events-none absolute left-[33%] top-[30%] h-[26rem] w-[26rem] rounded-full border border-white/10" />

      <section className="relative flex flex-col justify-between gap-16 p-8 lg:p-14">
        <div className="flex items-center gap-3">
          <Badge size={64} />
          <span className="text-[11px] uppercase leading-tight tracking-[0.2em] text-white/80">
            St. John Ambulance
            <br />
            Kisii University
          </span>
        </div>

        <div>
          <p className="font-copy text-xl italic text-white/80">Take a step</p>
          <h1 className="heading mt-3 text-3xl leading-snug sm:text-4xl lg:text-5xl">
            Toward the
            <br />
            Light
          </h1>
          <p className="font-copy mt-8 max-w-sm text-sm leading-relaxed text-white/60">
            Service, training and fellowship, all in one place.
          </p>
        </div>

        <p className="hidden text-[11px] uppercase tracking-[0.3em] text-white/40 lg:block">
          Kisii University Division
        </p>
      </section>

      <section className="relative flex items-center justify-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-sm">
          <h2 className="heading accent-bar text-xl">{title}</h2>
          {subtitle && <p className="font-copy mt-4 text-sm leading-relaxed text-white/60">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
