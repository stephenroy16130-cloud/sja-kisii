import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import CrewTargets from "@/components/crew-targets";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { opPhase, targetCrewIds, type OpPhase } from "@/lib/fieldops";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import CreateFieldOpForm from "./create-fieldop-form";

export const dynamic = "force-dynamic";

const phaseTone: Record<OpPhase, string> = {
  UPCOMING: "border-gold/50 text-gold",
  LIVE: "border-ok/50 text-ok",
  PAST: "border-white/20 text-white/50",
};
const phaseWord: Record<OpPhase, string> = { UPCOMING: "Upcoming", LIVE: "Happening now", PAST: "Completed" };

type Op = {
  id: string;
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  allCrews: boolean;
  crews: { id: number }[];
};

function Row({ op, now }: { op: Op; now: Date }) {
  const phase = opPhase(op.startsAt, op.endsAt, now);
  return (
    <Link
      href={`/dashboard/fieldops/${op.id}`}
      className="block rounded-2xl border border-white/10 bg-card p-5 transition hover:border-white/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-light">{op.title}</p>
          <p className="mt-1 text-sm text-white/60">
            {fmt(op.startsAt)}
            {op.location ? ` · ${op.location}` : ""}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${phaseTone[phase]}`}>
          {phaseWord[phase]}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <CrewTargets allCrews={op.allCrews} crewIds={targetCrewIds(op)} />
      </div>
    </Link>
  );
}

export default async function FieldOpsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canManage = can(user, "fieldop:manage");
  const where: Prisma.FieldOpWhereInput = canManage
    ? {}
    : { OR: [{ allCrews: true }, ...(user.crewId ? [{ crews: { some: { id: user.crewId } } }] : [])] };

  const ops = await db.fieldOp.findMany({
    where,
    orderBy: { startsAt: "desc" },
    take: 100,
    include: { crews: { select: { id: true } } },
  });

  const now = new Date();
  const active = ops
    .filter((o) => opPhase(o.startsAt, o.endsAt, now) !== "PAST")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = ops.filter((o) => opPhase(o.startsAt, o.endsAt, now) === "PAST");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Field operations</h1>
        <p className="mt-1 text-sm text-white/50">Service in the field. Every attendance earns 15 points.</p>
      </div>

      {canManage && (
        <section>
          <h2 className="mb-4 text-xl font-light">Create an operation</h2>
          <CreateFieldOpForm />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-light">Upcoming and live</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            Nothing scheduled.
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((o) => (
              <Row key={o.id} op={o} now={now} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Past</h2>
          <div className="space-y-3">
            {past.map((o) => (
              <Row key={o.id} op={o} now={now} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
