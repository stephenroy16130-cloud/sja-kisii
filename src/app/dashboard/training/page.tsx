import type { Prisma, TrainingType, VerificationStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import CrewTargets from "@/components/crew-targets";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { allowedTypes, statusTone, statusWord, typeLabel } from "@/lib/training";
import CreateTrainingForm from "./create-training-form";
import VerifyButtons from "./verify-buttons";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: TrainingType;
  title: string;
  heldAt: Date;
  crewId: number | null;
  status: VerificationStatus;
  createdBy: { fullName: string };
};

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

function Item({ t, verify }: { t: Row; verify?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5 transition hover:border-white/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/dashboard/training/${t.id}`} className="min-w-0 flex-1">
          <p className="text-lg font-light">{t.title}</p>
          <p className="mt-1 text-sm text-white/60">
            {fmt(t.heldAt)} · by {t.createdBy.fullName}
          </p>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${chip} border-white/20 text-white/70`}>{typeLabel[t.type]}</span>
          <span className={`${chip} ${statusTone[t.status]}`}>{statusWord[t.status]}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <CrewTargets allCrews={t.crewId === null} crewIds={t.crewId ? [t.crewId] : []} />
        </div>
        {verify && <VerifyButtons id={t.id} />}
      </div>
    </div>
  );
}

export default async function TrainingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const verifier = can(user, "training:verify");
  const types = allowedTypes(user);

  // Members see verified sessions for their audience. Creators also see their own. DO Training sees all.
  const where: Prisma.TrainingWhereInput = verifier
    ? {}
    : {
        OR: [
          { createdById: user.id },
          {
            status: "VERIFIED",
            OR: [{ crewId: null }, ...(user.crewId ? [{ crewId: user.crewId }] : [])],
          },
        ],
      };

  const all = await db.training.findMany({
    where,
    orderBy: { heldAt: "desc" },
    take: 100,
    select: {
      id: true, type: true, title: true, heldAt: true, crewId: true, status: true,
      createdBy: { select: { fullName: true } },
    },
  });

  const now = new Date();
  const waiting = verifier ? all.filter((t) => t.status === "PENDING") : [];
  const rest = verifier ? all.filter((t) => t.status !== "PENDING") : all;
  const upcoming = rest.filter((t) => t.heldAt >= now).reverse();
  const past = rest.filter((t) => t.heldAt < now);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Training</h1>
        <p className="mt-1 text-sm text-white/50">Drills and First Aid. Verified sessions earn 10 points each.</p>
      </div>

      {types.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Create a record</h2>
          <CreateTrainingForm types={types} canPickCrew={verifier} autoVerified={verifier} />
        </section>
      )}

      {verifier && (
        <section>
          <h2 className="mb-4 text-xl font-light">Waiting for verification ({waiting.length})</h2>
          {waiting.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
              Nothing waiting. All caught up.
            </div>
          ) : (
            <div className="space-y-3">
              {waiting.map((t) => (
                <Item key={t.id} t={t} verify />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-light">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            No upcoming sessions.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((t) => (
              <Item key={t.id} t={t} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">Past</h2>
          <div className="space-y-3">
            {past.map((t) => (
              <Item key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
