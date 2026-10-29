import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

const schema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(120),
    description: z.string().trim().max(1000).optional(),
    location: z.string().trim().max(200).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    allCrews: z.boolean(),
    crewIds: z.array(z.number().int().min(1).max(4)).max(4).default([]),
  })
  .refine((d) => d.allCrews || d.crewIds.length > 0, { message: "Choose at least one crew", path: ["crewIds"] })
  .refine((d) => !d.endsAt || new Date(d.endsAt) > new Date(d.startsAt), {
    message: "End must be after the start",
    path: ["endsAt"],
  });

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("fieldop:manage");
  const data = schema.parse(await req.json());
  const crewIds = [...new Set(data.crewIds)];

  const op = await db.fieldOp.create({
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      allCrews: data.allCrews,
      crews: data.allCrews ? undefined : { connect: crewIds.map((id) => ({ id })) },
      createdById: actor.id,
    },
    select: { id: true, title: true },
  });
  await audit(actor.id, "FIELDOP_CREATED", "FieldOp", op.id, {
    title: op.title,
    allCrews: data.allCrews,
    crewIds: data.allCrews ? [] : crewIds,
  });
  return Response.json(op, { status: 201 });
});
