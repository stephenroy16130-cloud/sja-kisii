export const DISPUTE_DAYS = 14;

type Ev = {
  meeting?: { title: string; startsAt: Date } | null;
  fieldOp?: { title: string; startsAt: Date } | null;
  training?: { title: string; heldAt: Date } | null;
};

export function eventInfo(r: Ev): { kind: string; title: string; date: Date } | null {
  if (r.meeting) return { kind: "Meeting", title: r.meeting.title, date: r.meeting.startsAt };
  if (r.fieldOp) return { kind: "Field operation", title: r.fieldOp.title, date: r.fieldOp.startsAt };
  if (r.training) return { kind: "Training", title: r.training.title, date: r.training.heldAt };
  return null;
}

export const withinWindow = (date: Date, now = new Date()) =>
  now.getTime() - date.getTime() <= DISPUTE_DAYS * 86_400_000;
