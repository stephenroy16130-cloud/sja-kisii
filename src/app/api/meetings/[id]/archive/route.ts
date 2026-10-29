import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("meeting:manage");
  const { id } = await ctx.params;
  const { archived } = z.object({ archived: z.boolean() }).parse(await req.json());

  const meeting = await db.meeting.findUnique({ where: { id } });
  if (!meeting) throw new HttpError(404, "Meeting not found");
  if (archived && meeting.startsAt > new Date()) {
    throw new HttpError(409, "Only past meetings can be deleted");
  }

  // Soft delete: hidden from the dashboard, kept in the database for analytics
  await db.meeting.update({
    where: { id },
    data: archived ? { archivedAt: new Date(), archivedById: actor.id } : { archivedAt: null, archivedById: null },
  });
  await audit(actor.id, archived ? "MEETING_ARCHIVED" : "MEETING_RESTORED", "Meeting", id, { title: meeting.title });
  return Response.json({ id, archived });
});
