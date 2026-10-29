import type { ReactNode } from "react";

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
    <main className="grid min-h-screen bg-black lg:grid-cols-[1.1fr_0.9fr]">
      <section className="vignette-dark relative flex flex-col justify-between gap-16 overflow-hidden p-8 text-white lg:p-14">
        <div className="pointer-events-none absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-24 top-[30%] h-[26rem] w-[26rem] rounded-full border border-white/10" />

        <div className="relative flex items-center gap-3">
          <span className="text-3xl leading-none">✳</span>
          <span className="text-[11px] uppercase leading-tight tracking-[0.2em] text-white/80">
            St. John Ambulance
            <br />
            Kisii University
          </span>
        </div>

        <div className="relative">
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

        <p className="relative hidden text-[11px] uppercase tracking-[0.3em] text-white/40 lg:block">
          Kisii University Division
        </p>
      </section>

      <section className="flex items-center justify-center border-t border-white/10 bg-black px-6 py-12 lg:border-l lg:border-t-0 lg:px-14">
        <div className="w-full max-w-sm">
          <h2 className="heading accent-bar text-xl">{title}</h2>
          {subtitle && <p className="font-copy mt-4 text-sm leading-relaxed text-white/60">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
