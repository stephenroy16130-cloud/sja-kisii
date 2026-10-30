import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { kes } from "@/lib/store";
import AnnouncementForm from "./announcement-form";
import MembershipForm from "./membership-form";
import MembershipReview from "./membership-review";
import RsvpButtons from "./rsvp-buttons";
import WhatsappEditor from "./whatsapp-editor";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";
const box = "rounded-2xl border border-white/10 bg-card p-5";
const empty = "rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50";
const tone = {
  PENDING: "border-warn/50 text-warn",
  APPROVED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
} as const;
const word = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" } as const;

export default async function CrewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const crewId = user.crewId;
  const leader = can(user, "crew:create_announcement") && crewId !== null;
  const admin = can(user, "crew:approve_membership_change");
  if (crewId === null && !admin) redirect("/dashboard");

  const crew = crewId !== null ? await db.crew.findUnique({ where: { id: crewId } }) : null;

  const [members, announcements] =
    crewId !== null
      ? await Promise.all([
          db.user.findMany({
            where: { crewId, status: "ACTIVE", isDeveloper: false },
            orderBy: { fullName: "asc" },
            select: { id: true, fullName: true, titles: true },
          }),
          db.announcement.findMany({
            where: { crewId },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
              createdBy: { select: { fullName: true } },
              rsvps: { select: { userId: true, response: true, user: { select: { fullName: true } } } },
            },
          }),
        ])
      : [[], []];

  const addable = leader
    ? await db.user.findMany({
        where: {
          status: "ACTIVE", isDeveloper: false, isSuperintendent: false,
          titles: { isEmpty: true }, NOT: { crewId },
        },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, crewId: true },
      })
    : [];
  const removable = leader
    ? await db.user.findMany({
        where: { status: "ACTIVE", isDeveloper: false, crewId, titles: { isEmpty: true }, NOT: { id: user.id } },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, crewId: true },
      })
    : [];

  const mine = leader
    ? await db.membershipRequest.findMany({
        where: { crewId },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { targetUser: { select: { fullName: true } } },
      })
    : [];

  const pending = admin
    ? await db.membershipRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          targetUser: { select: { fullName: true, crewId: true } },
          requestedBy: { select: { fullName: true } },
        },
      })
    : [];

  return (
    <div className="space-y-10">
      {crewId !== null && (
        <section className="vignette-dark rounded-3xl border border-white/10 p-7 md:p-10">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gold">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(crewId) }} />
            Your crew
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-tight md:text-4xl">{crewName(crewId)}</h1>
          <p className="mt-2 text-sm text-white/60">{members.length} active members</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {crew?.whatsappLink ? (
              <a
                href={crew.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110"
              >
                Join WhatsApp group
              </a>
            ) : (
              <span className="text-sm text-white/50">No WhatsApp group link yet.</span>
            )}
            {(leader || admin) && <WhatsappEditor crewId={crewId} link={crew?.whatsappLink ?? null} />}
          </div>
        </section>
      )}

      {admin && (
        <section>
          <h2 className="mb-4 text-xl font-light">Membership requests ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className={empty}>No requests waiting.</div>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <div key={r.id} className={`${box} flex flex-wrap items-center justify-between gap-4`}>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium uppercase tracking-wide">{r.targetUser.fullName}</span>
                      <span className="text-white/50">
                        {r.action === "ADD" ? " → add to " : " → remove from "}
                      </span>
                      {crewName(r.crewId)}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Requested by {r.requestedBy.fullName} · {fmt(r.createdAt)}
                      {r.action === "ADD" && r.targetUser.crewId
                        ? ` · currently in ${crewName(r.targetUser.crewId)}`
                        : ""}
                    </p>
                  </div>
                  <MembershipReview id={r.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {crewId !== null && (
        <section>
          <h2 className="mb-4 text-xl font-light">Announcements</h2>
          {announcements.length === 0 ? (
            <div className={empty}>No announcements yet.</div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => {
                const myRsvp = a.rsvps.find((r) => r.userId === user.id)?.response ?? null;
                const n = (v: string) => a.rsvps.filter((r) => r.response === v).length;
                return (
                  <div key={a.id} className="rounded-3xl border border-white/10 bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-light">{a.title}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {a.createdBy.fullName} · {fmt(a.createdAt)}
                        </p>
                      </div>
                      {a.eventDate && (
                        <span className={`${chip} border-gold/50 text-gold`}>{fmt(a.eventDate)}</span>
                      )}
                    </div>
                    <p className="font-copy mt-4 whitespace-pre-line text-sm leading-relaxed text-white/80">{a.body}</p>
                    {a.paymentAmount && (
                      <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm">
                        <span className="text-gold">{kes(a.paymentAmount)}</span>
                        {a.paymentLabel ? ` · ${a.paymentLabel}` : ""}
                        <p className="mt-1 text-xs text-white/40">
                          Pay by M-Pesa. Online payment arrives with the M-Pesa update, so confirm with your leader for now.
                        </p>
                      </div>
                    )}
                    {a.requiresRsvp && (
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                        <RsvpButtons announcementId={a.id} current={myRsvp} />
                        <p className="text-xs text-white/50">
                          <span className="text-ok">{n("GOING")}</span> going ·{" "}
                          <span className="text-warn">{n("MAYBE")}</span> maybe ·{" "}
                          <span className="text-bad">{n("NOT_GOING")}</span> can&apos;t
                        </p>
                      </div>
                    )}
                    {leader && a.requiresRsvp && a.rsvps.length > 0 && (
                      <details className="mt-3 text-xs text-white/50">
                        <summary className="cursor-pointer hover:text-white">Who replied</summary>
                        <ul className="mt-2 space-y-1">
                          {a.rsvps.map((r) => (
                            <li key={r.userId}>
                              {r.user.fullName}: {r.response === "NOT_GOING" ? "Can't go" : r.response.toLowerCase()}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {leader && (
        <>
          <section>
            <h2 className="mb-4 text-xl font-light">Post an announcement</h2>
            <AnnouncementForm />
          </section>

          <section>
            <h2 className="mb-2 text-xl font-light">Change who is in your crew</h2>
            <p className="mb-4 text-sm text-white/50">The DO Admin approves every change.</p>
            <MembershipForm addable={addable} removable={removable} />
            {mine.length > 0 && (
              <div className="mt-4 space-y-2">
                {mine.map((r) => (
                  <div key={r.id} className={`${box} flex flex-wrap items-center justify-between gap-3`}>
                    <p className="text-sm">
                      <span className="uppercase tracking-wide">{r.targetUser.fullName}</span>
                      <span className="text-white/50">{r.action === "ADD" ? " · add" : " · remove"}</span>
                    </p>
                    <span className={`${chip} ${tone[r.status]}`}>{word[r.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {crewId !== null && (
        <section>
          <h2 className="mb-4 text-xl font-light">Crew members ({members.length})</h2>
          {members.length === 0 ? (
            <div className={empty}>No active members yet.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((m) => (
                <div key={m.id} className={`${box} flex items-center justify-between gap-3 !py-3`}>
                  <span className="text-sm uppercase tracking-wide">{m.fullName}</span>
                  {m.titles.length > 0 && (
                    <span className={`${chip} border-gold/50 text-gold`}>
                      {m.titles[0].replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
