"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export default function ErrorCard({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl border border-white/10 bg-card p-8 text-center">
      <h2 className="text-2xl font-light">Connection problem</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        This page could not load. It usually means the database is unreachable or still waking up. Check your
        connection and try again.
      </p>
      <button
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
        className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
      >
        Try again
      </button>
    </div>
  );
}
