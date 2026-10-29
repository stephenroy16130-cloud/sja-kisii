import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { isApologyLocked } from "@/lib/meetings";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { reason } = z.object({ reason: z.string().trim().min(5, "Please give a reason").max(500) }).parse(await req.json());

  const meeting = await db.meeting.findUnique({ where: { id } });
  if (!meeting) throw new HttpError(404, "Meeting not found");
  if (meeting.archivedAt) throw new HttpError(409, "This meeting is archived");
  if (isApologyLocked(meeting.startsAt)) {
    throw new HttpError(409, "Apologies closed 2 hours before the meeting");
  }

  const key = { meetingId_userId: { meetingId: id, userId: user.id } };
  const existing = await db.apology.findUnique({ where: key });
  if (existing && existing.status !== "PENDING") {
    throw new HttpError(409, "Your apology has already been decided");
  }

  const apology = await db.apology.upsert({
    where: key,
    update: { reason },
    create: { meetingId: id, userId: user.id, reason },
    select: { id: true, status: true },
  });
  return Response.json(apology, { status: 201 });
});
