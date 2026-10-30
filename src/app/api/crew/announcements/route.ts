import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  body: z.string().trim().min(3, "Write a message").max(2000),
  eventDate: z.string().datetime().optional(),
  requiresRsvp: z.boolean().default(false),
  paymentAmount: z.number().positive("Enter an amount").max(1_000_000).optional(),
  paymentLabel: z.string().trim().max(80).optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("crew:create_announcement");
  if (!actor.crewId) throw new HttpError(400, "You are not assigned to a crew");
  const d = schema.parse(await req.json());

  const a = await db.announcement.create({
    data: {
      crewId: actor.crewId,
      createdById: actor.id,
      title: d.title,
      body: d.body,
      eventDate: d.eventDate ? new Date(d.eventDate) : null,
      requiresRsvp: d.requiresRsvp,
      paymentAmount: d.paymentAmount ?? null,
      paymentLabel: d.paymentAmount ? d.paymentLabel || null : null,
    },
    select: { id: true, title: true },
  });
  await audit(actor.id, "CREW_ANNOUNCEMENT_CREATED", "Announcement", a.id, { title: a.title, crewId: actor.crewId });
  return Response.json(a, { status: 201 });
});
