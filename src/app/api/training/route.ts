import type { TrainingType } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { fmt } from "@/lib/meetings";
import { notifyAudience } from "@/lib/push";
import { can } from "@/lib/rbac";
import { allowedTypes } from "@/lib/training";

const schema = z.object({
  type: z.enum(["DRILL", "FIRST_AID", "BAND"]),
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(1000).optional(),
  heldAt: z.string().datetime(),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const data = schema.parse(await req.json());
  const verifier = can(actor, "training:verify");

  if (data.type === "BAND") {
    // Band practice: the Band Lead or DO Training
    if (!verifier && !can(actor, "band:issue_instruments")) {
      throw new HttpError(403, "Only the Band Lead or DO Training can create band practices");
    }
  } else if (!(allowedTypes(actor) as TrainingType[]).includes(data.type)) {
    throw new HttpError(403, "You cannot create this type of training record");
  }

  // Drills and band practice are not tied to a crew. First Aid belongs to the leader's crew.
  let crewId: number | null = null;
  if (data.type === "FIRST_AID") {
    if (verifier) {
      crewId = data.crewId ?? null;
    } else {
      if (!actor.crewId) throw new HttpError(400, "You are not assigned to a crew");
      crewId = actor.crewId;
    }
  }

  // Band practice created by the Band Lead counts straight away
  const counted = verifier || data.type === "BAND";
  const training = await db.training.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description || null,
      heldAt: new Date(data.heldAt),
      crewId,
      createdById: actor.id,
      status: counted ? "VERIFIED" : "PENDING",
      verifiedById: counted ? actor.id : null,
      verifiedAt: counted ? new Date() : null,
    },
    select: { id: true, title: true, status: true },
  });
  await audit(actor.id, "TRAINING_CREATED", "Training", training.id, {
    type: data.type,
    title: training.title,
    status: training.status,
  });

  if (training.status === "VERIFIED") {
    after(() =>
      notifyAudience(
        data.type === "BAND" ? "BAND" : crewId === null ? "GENERAL" : "CREW",
        crewId,
        {
          title: (data.type === "BAND" ? "Band practice: " : "New training: ") + training.title,
          body: fmt(new Date(data.heldAt)),
          url: "/dashboard/training/" + training.id,
          tag: "event-" + training.id,
        },
        actor.id
      )
    );
  }
  return Response.json(training, { status: 201 });
});
