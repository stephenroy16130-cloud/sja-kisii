import Link from "next/link";
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
      <section className="relative hidden flex-col justify-between overflow-hidden bg-black p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,148,43,0.45),transparent_60%)]" />
        <div className="relative flex items-center gap-3 text-sm">
          <span className="text-2xl text-amber-400">✳</span>
          <span>
            St. John Ambulance
            <br />
            Kisii University
          </span>
        </div>
        <div className="relative">
          <h1 className="text-6xl font-light leading-[1.05] tracking-tight">
            Take a step
            <br />
            toward the light
          </h1>
          <p className="mt-6 max-w-sm text-lg font-light text-neutral-300">
            Service, training and fellowship, all in one place.
          </p>
        </div>
        <p className="relative text-xs text-neutral-500">Kisii University Division</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 block text-sm text-neutral-500 lg:hidden">
            ✳ St. John Ambulance · Kisii University
          </Link>
          <h2 className="text-3xl font-light tracking-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
