import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";
import { allowedTypes } from "@/lib/training";

const schema = z.object({
  type: z.enum(["DRILL", "FIRST_AID"]),
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(1000).optional(),
  heldAt: z.string().datetime(),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const data = schema.parse(await req.json());

  if (!allowedTypes(actor).includes(data.type)) {
    throw new HttpError(403, "You cannot create this type of training record");
  }

  // Drills are for everyone. First Aid belongs to the leader's crew (DO Training may choose any crew or all).
  const verifier = can(actor, "training:verify");
  let crewId: number | null = null;
  if (data.type === "FIRST_AID") {
    if (verifier) {
      crewId = data.crewId ?? null;
    } else {
      if (!actor.crewId) throw new HttpError(400, "You are not assigned to a crew");
      crewId = actor.crewId;
    }
  }

  const training = await db.training.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description || null,
      heldAt: new Date(data.heldAt),
      crewId,
      createdById: actor.id,
      status: verifier ? "VERIFIED" : "PENDING",
      verifiedById: verifier ? actor.id : null,
      verifiedAt: verifier ? new Date() : null,
    },
    select: { id: true, title: true, status: true },
  });
  await audit(actor.id, "TRAINING_CREATED", "Training", training.id, {
    type: data.type,
    title: training.title,
    status: training.status,
  });
  return Response.json(training, { status: 201 });
});
