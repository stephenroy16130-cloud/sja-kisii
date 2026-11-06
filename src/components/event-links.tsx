import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { linkLabel } from "@/lib/google-links";
import { canManageQr, EVENT_TYPE, loadEvent, type QrKind } from "@/lib/qr";
import { AddLinkForm, RemoveLinkButton } from "./event-links-client";

// Google Docs links for an event (agenda, minutes, report). The event page decides who can open the page.
export default async function EventLinks({ kind, id }: { kind: QrKind; id: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const e = await loadEvent(kind, { id });
  if (!e) return null;

  const manage = canManageQr(user, e);
  const links = await db.eventLink.findMany({
    where: { kind: EVENT_TYPE[kind], eventId: id },
    orderBy: { createdAt: "asc" },
  });
  if (links.length === 0 && !manage) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Documents</p>
      <h2 className="mt-1 text-xl font-light">Agenda, minutes and reports</h2>

      {links.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">No documents linked yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-white/10">
          {links.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm">{l.title}</p>
                <p className="mt-0.5 text-xs text-white/40">{linkLabel(l.url)}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200"
                >
                  Open
                </a>
                {(manage || l.addedById === user.id) && <RemoveLinkButton kind={kind} id={id} linkId={l.id} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {manage && <AddLinkForm kind={kind} id={id} />}
    </section>
  );
}
