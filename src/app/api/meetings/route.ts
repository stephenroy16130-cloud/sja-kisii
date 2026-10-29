import { z } from "zod";
import { audit, requirePermission, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

const createSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(200).optional(),
  startsAt: z.string().datetime(),
});

export const GET = route(async () => {
  await requireUser();
  const meetings = await db.meeting.findMany({ where: { archivedAt: null }, orderBy: { startsAt: "desc" }, take: 100 });
  return Response.json({ meetings });
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("meeting:manage");
  const data = createSchema.parse(await req.json());
  const meeting = await db.meeting.create({
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startsAt: new Date(data.startsAt),
      createdById: actor.id,
    },
    select: { id: true, title: true },
  });
  await audit(actor.id, "MEETING_CREATED", "Meeting", meeting.id, { title: meeting.title });
  return Response.json(meeting, { status: 201 });
});
