import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { response } = z.object({ response: z.enum(["GOING", "NOT_GOING", "MAYBE"]) }).parse(await req.json());

  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Announcement not found");
  if (a.crewId !== actor.crewId) throw new HttpError(403, "This announcement is for another crew");
  if (!a.requiresRsvp) throw new HttpError(400, "This announcement does not take RSVPs");

  const rsvp = await db.announcementRsvp.upsert({
    where: { announcementId_userId: { announcementId: id, userId: actor.id } },
    update: { response },
    create: { announcementId: id, userId: actor.id, response },
    select: { response: true },
  });
  return Response.json(rsvp);
});
