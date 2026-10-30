import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BAND_TITLES, canIssue, canManageInventory, canSeeBand, statusTone, statusWord } from "@/lib/band";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import AddInstrumentForm from "./add-instrument-form";
import InstrumentEdit from "./instrument-edit";
import IssueForm from "./issue-form";
import ReturnActions from "./return-actions";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";
const box = "rounded-2xl border border-white/10 bg-card p-5";
const empty = "rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50";
const open = { returnedAt: null, markedLost: false };

async function loadManage() {
  const [instruments, roster, openLogs, history] = await Promise.all([
    db.bandInstrument.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false, titles: { hasSome: BAND_TITLES } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, crewId: true, titles: true },
    }),
    db.instrumentIssuanceLog.findMany({
      where: open,
      orderBy: { issuedAt: "desc" },
      include: { instrument: { select: { name: true, type: true } }, issuedTo: { select: { fullName: true } } },
    }),
    db.instrumentIssuanceLog.findMany({
      where: { OR: [{ returnedAt: { not: null } }, { markedLost: true }] },
      orderBy: { issuedAt: "desc" },
      take: 30,
      include: { instrument: { select: { name: true } }, issuedTo: { select: { fullName: true } } },
    }),
  ]);
  return { instruments, roster, openLogs, history };
}

export default async function BandPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canSeeBand(user)) redirect("/dashboard");

  const manage = canManageInventory(user);
  const issue = canIssue(user);

  const [mine, data] = await Promise.all([
    db.instrumentIssuanceLog.findMany({
      where: { issuedToId: user.id, ...open },
      orderBy: { issuedAt: "desc" },
      include: { instrument: { select: { name: true, type: true, serialNumber: true } } },
    }),
    manage ? loadManage() : Promise.resolve(null),
  ]);

  const held = new Map<string, number>();
  data?.openLogs.forEach((l) => held.set(l.issuedToId, (held.get(l.issuedToId) ?? 0) + 1));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Band</h1>
        <p className="mt-1 text-sm text-white/50">
          {issue
            ? "Roster, instruments and who holds what."
            : manage
              ? "Roster, instruments and issue history. The Band Lead issues and receives instruments."
              : "Your instruments."}
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-light">My instruments</h2>
        {mine.length === 0 ? (
          <div className={empty}>You are not holding any instruments.</div>
        ) : (
          <div className="space-y-3">
            {mine.map((l) => (
              <div key={l.id} className={box}>
                <p className="font-light">
                  {l.instrument.name} <span className="text-white/40">· {l.instrument.type}</span>
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Issued {fmt(l.issuedAt)}
                  {l.instrument.serialNumber ? ` · Serial ${l.instrument.serialNumber}` : ""}
                </p>
                <p className="mt-2 text-xs text-white/40">Return it to the Band Lead after use.</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {manage && data && (
        <>
          <section>
            <h2 className="mb-4 text-xl font-light">Currently issued ({data.openLogs.length})</h2>
            {data.openLogs.length === 0 ? (
              <div className={empty}>Nothing is out right now.</div>
            ) : (
              <div className="space-y-3">
                {data.openLogs.map((l) => (
                  <div key={l.id} className={box}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-light">
                          {l.instrument.name} <span className="text-white/40">· {l.instrument.type}</span>
                        </p>
                        <p className="mt-1 text-sm text-white/60">
                          <span className="uppercase tracking-wide">{l.issuedTo.fullName}</span> · issued {fmt(l.issuedAt)}
                        </p>
                        {l.notes && <p className="mt-1 text-xs text-white/40">&ldquo;{l.notes}&rdquo;</p>}
                      </div>
                      <span className={`${chip} ${statusTone.ISSUED}`}>Issued</span>
                    </div>
                    {issue && (
                      <div className="mt-4">
                        <ReturnActions logId={l.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {issue && (
            <section>
              <h2 className="mb-4 text-xl font-light">Issue an instrument</h2>
              <IssueForm
                instruments={data.instruments
                  .filter((i) => i.status === "AVAILABLE")
                  .map((i) => ({ id: i.id, name: i.name, type: i.type }))}
                members={data.roster.map((m) => ({ id: m.id, fullName: m.fullName }))}
              />
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xl font-light">Band roster ({data.roster.length})</h2>
            {data.roster.length === 0 ? (
              <div className={empty}>No band members yet. The Superintendent gives the Band Member title in People.</div>
            ) : (
              <div className="space-y-3">
                {data.roster.map((m) => (
                  <div key={m.id} className={`${box} flex flex-wrap items-center justify-between gap-3`}>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wide">{m.fullName}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-white/50">
                        {m.crewId && (
                          <>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(m.crewId) }} />
                            {crewName(m.crewId)}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.titles.includes("BAND_LEAD") && (
                        <span className={`${chip} border-gold/50 text-gold`}>Band Lead</span>
                      )}
                      <span className={`${chip} border-white/20 text-white/60`}>
                        {held.get(m.id) ?? 0} held
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light">Add an instrument</h2>
            <AddInstrumentForm />
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light">Inventory ({data.instruments.length})</h2>
            {data.instruments.length === 0 ? (
              <div className={empty}>No instruments yet.</div>
            ) : (
              <div className="space-y-3">
                {data.instruments.map((i) => (
                  <div key={i.id} className={box}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-light">
                          {i.name} <span className="text-white/40">· {i.type}</span>
                        </p>
                        <p className="mt-1 text-sm text-white/50">
                          {i.serialNumber ? `Serial ${i.serialNumber}` : "No serial number"}
                          {i.condition ? ` · ${i.condition}` : ""}
                        </p>
                        {i.notes && <p className="mt-1 text-xs text-white/40">{i.notes}</p>}
                      </div>
                      <span className={`${chip} ${statusTone[i.status]}`}>{statusWord[i.status]}</span>
                    </div>
                    <div className="mt-4">
                      <InstrumentEdit inst={i} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {data.history.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xl font-light text-white/60 hover:text-white">
                History ({data.history.length})
              </summary>
              <div className="mt-4 space-y-3">
                {data.history.map((l) => (
                  <div key={l.id} className={box}>
                    <p className="text-sm">
                      {l.instrument.name} ·{" "}
                      <span className="uppercase tracking-wide">{l.issuedTo.fullName}</span>
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Issued {fmt(l.issuedAt)}
                      {l.returnedAt ? ` · returned ${fmt(l.returnedAt)}` : ""}
                      {l.markedLost ? " · marked lost" : ""}
                      {l.markedDamaged ? " · returned damaged" : ""}
                      {l.conditionOnReturn ? ` · ${l.conditionOnReturn}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
