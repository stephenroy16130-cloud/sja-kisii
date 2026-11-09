import { after } from "next/server";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { notifyAudience } from "@/lib/push";

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(500).optional(),
  amount: z.number().int("Use whole shillings").min(1, "Enter the price").max(100_000),
  crewId: z.number().int().min(1).max(4).nullable().optional(),
  closesAt: z.string().datetime().optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("finance:manage");
  const d = schema.parse(await req.json());
  const crewId = d.crewId ?? null;

  const c = await db.collection.create({
    data: {
      title: d.title,
      description: d.description || null,
      amount: d.amount,
      crewId,
      closesAt: d.closesAt ? new Date(d.closesAt) : null,
      createdById: actor.id,
    },
    select: { id: true, title: true },
  });
  await audit(actor.id, "COLLECTION_CREATED", "Collection", c.id, { title: c.title, amount: d.amount, crewId });

  // Tell the people who can pay that it is open
  after(() =>
    notifyAudience(
      crewId === null ? "GENERAL" : "CREW",
      crewId,
      { title: "Payment open: " + c.title, body: `KES ${d.amount.toLocaleString("en-KE")}. Tap to pay with M-Pesa.`, url: "/dashboard/pay", tag: "collection-" + c.id },
      actor.id
    )
  );
  return Response.json(c, { status: 201 });
});
