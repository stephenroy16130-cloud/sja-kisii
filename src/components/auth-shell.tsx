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
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative flex flex-col justify-between gap-12 overflow-hidden bg-black p-8 text-white lg:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_85%_0%,rgba(255,255,255,0.18),transparent_70%)]" />
        <div className="relative flex items-center gap-3">
          <span className="text-3xl leading-none">✳</span>
          <span className="text-sm leading-tight text-white/80">
            St. John Ambulance
            <br />
            Kisii University
          </span>
        </div>

        <div className="relative">
          <h1 className="text-5xl font-light leading-[1.05] tracking-tight lg:text-7xl">
            Take a step
            <br />
            toward the light
          </h1>
          <p className="mt-6 max-w-md text-lg font-light text-white/60">
            Service, training and fellowship, all in one place.
          </p>
        </div>

        <p className="relative hidden text-xs uppercase tracking-widest text-white/40 lg:block">
          Kisii University Division
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12 lg:px-14">
        <div className="w-full max-w-sm">
          <h2 className="text-4xl font-light tracking-tight">{title}</h2>
          {subtitle && <p className="mt-3 text-sm text-neutral-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
