import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingLockReason } from "@/lib/event-edit";
import { canManageQr, loadEvent, type QrKind } from "@/lib/qr";
import { hasField } from "@/lib/schema-info";
import EventEditor from "./event-editor";

const MODEL = { meeting: "Meeting", fieldop: "FieldOp", training: "Training" } as const;

// Edit and Delete for whoever is in charge of the event
export default async function EventManage({ kind, id }: { kind: QrKind; id: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const e = await loadEvent(kind, { id });
  if (!e || !canManageQr(user, e)) return null;

  const locked = kind === "training" ? await trainingLockReason(user, id) : null;

  const raw =
    kind === "meeting"
      ? await db.meeting.findUnique({ where: { id } })
      : kind === "fieldop"
        ? await db.fieldOp.findUnique({ where: { id } })
        : await db.training.findUnique({ where: { id } });
  const r = (raw ?? {}) as Record<string, unknown>;
  const model = MODEL[kind];
  const text = (f: string) => (hasField(model, f) ? String(r[f] ?? "") : null);
  const hasEnds = kind === "fieldop" && hasField("FieldOp", "endsAt");

  return (
    <EventEditor
      kind={kind}
      id={id}
      backHref={kind === "meeting" ? "/dashboard/meetings" : kind === "fieldop" ? "/dashboard/fieldops" : e.bandOnly ? "/dashboard/band" : "/dashboard/training"}
      title={e.title}
      description={text("description")}
      location={text("location")}
      startsAt={e.startsAt.toISOString()}
      endsAt={hasEnds && r.endsAt instanceof Date ? r.endsAt.toISOString() : null}
      hasEnds={hasEnds}
      showCrews={kind === "fieldop"}
      allCrews={e.crewIds === null}
      crewIds={e.crewIds ?? []}
      locked={locked}
      leadersOnly={kind === "meeting" && hasField("Meeting", "leadersOnly") ? Boolean(r.leadersOnly) : null}
    />
  );
}
