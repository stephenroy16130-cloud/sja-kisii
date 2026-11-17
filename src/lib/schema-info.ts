import { Prisma } from "@prisma/client";

// The columns a model really has, read from the generated client. The edit forms offer only fields that exist.
export function scalarFields(model: string): string[] {
  const e = (Prisma as unknown as Record<string, Record<string, string> | undefined>)[`${model}ScalarFieldEnum`];
  return e ? Object.keys(e) : [];
}
export const hasField = (model: string, field: string) => scalarFields(model).includes(field);
export const firstField = (model: string, candidates: string[]) => candidates.find((c) => hasField(model, c)) ?? null;
// The column in `child` that points at `parent`, for example fkTo("AnnouncementRsvp", "announcement")
export const fkTo = (child: string, parent: string) =>
  scalarFields(child).find((f) => f.toLowerCase() === `${parent.toLowerCase()}id`) ?? null;
