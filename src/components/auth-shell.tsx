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
    <main className="relative min-h-screen overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_0%,rgba(227,163,59,0.55),transparent_70%),radial-gradient(ellipse_45%_40%_at_10%_100%,rgba(185,115,26,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute -top-24 right-[28%] h-[150%] w-56 rotate-[18deg] bg-gradient-to-b from-amber-200/25 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -top-24 right-[12%] h-[150%] w-32 rotate-[18deg] bg-gradient-to-b from-amber-100/20 to-transparent blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col gap-10 lg:gap-16">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none text-glow">✳</span>
            <span className="text-sm leading-tight text-white/80">
              St. John Ambulance
              <br />
              Kisii University
            </span>
          </div>

          <div>
            <h1 className="text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Take a step
              <br />
              toward the light
            </h1>
            <p className="mt-6 max-w-md text-lg font-light text-white/70">
              Service, training and fellowship, all in one place.
            </p>
          </div>

          <div className="hidden max-w-sm rounded-2xl bg-white/10 p-5 text-sm leading-relaxed text-white/80 backdrop-blur lg:block">
            <span className="mb-2 block text-2xl leading-none text-glow">“</span>
            We want to be a family where people can connect, learn and grow through service.
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 text-ink shadow-2xl sm:p-10">
          <h2 className="text-3xl font-light tracking-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
