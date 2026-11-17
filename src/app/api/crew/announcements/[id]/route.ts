import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyAudience } from "@/lib/push";
import { can, type AuthUser } from "@/lib/rbac";
import { firstField, fkTo } from "@/lib/schema-info";

export const TEXT_FIELDS = ["body", "content", "message", "description", "text"];

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  text: z.string().trim().max(4000).optional(),
  amount: z.number().int().min(1).max(100_000).optional(),
});

async function load(actor: AuthUser, id: string) {
  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Announcement not found");
  const own = can(actor, "crew:create_announcement") && actor.crewId !== null && actor.crewId === a.crewId;
  if (!own && !can(actor, "content:moderate")) throw new HttpError(403, "You cannot change this announcement");
  const paid = await db.transaction.count({ where: { announcementId: id, status: "SUCCESS" } });
  return { a, paid };
}

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const d = schema.parse(await req.json());
  const { a, paid } = await load(actor, id);

  const data: Record<string, unknown> = { title: d.title };
  const textField = firstField("Announcement", TEXT_FIELDS);
  if (d.text !== undefined && textField) data[textField] = d.text;

  const current = (a as unknown as Record<string, unknown>).paymentAmount;
  if (d.amount !== undefined && current !== null && current !== undefined) {
    if (Number(String(current)) !== d.amount) {
      if (paid > 0) throw new HttpError(409, "Someone has already paid, so the fee can no longer be changed.");
      data.paymentAmount = d.amount;
    }
  }

  await db.announcement.update({ where: { id }, data: data as Prisma.AnnouncementUpdateInput });
  await audit(actor.id, "ANNOUNCEMENT_EDITED", "Announcement", id, { title: d.title });

  if (a.crewId) {
    const crewId = a.crewId;
    after(() =>
      notifyAudience("CREW", crewId, { title: "Updated: " + d.title, body: "Open the Crew page to read the change.", url: "/dashboard/crew", tag: "ann-" + id }, actor.id)
    );
  }
  return Response.json({ id });
});

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { a, paid } = await load(actor, id);
  if (paid > 0) throw new HttpError(409, "Someone has already paid for this, so it has to stay on record.");

  const fk = fkTo("AnnouncementRsvp", "announcement");
  await db.$transaction(async (tx) => {
    if (fk) await tx.announcementRsvp.deleteMany({ where: { [fk]: id } as unknown as Prisma.AnnouncementRsvpWhereInput });
    await tx.transaction.deleteMany({ where: { announcementId: id } }); // unfinished payment attempts only
    await tx.announcement.delete({ where: { id } });
  });
  await audit(actor.id, "ANNOUNCEMENT_DELETED", "Announcement", id, { title: a.title });
  return Response.json({ id });
});
