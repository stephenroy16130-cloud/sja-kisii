import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { pushHostOk } from "@/lib/push";

const MAX_DEVICES = 10;

const schema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

// Registers this device for the signed-in member. A device that was someone else's moves to the new member.
export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const d = schema.parse(await req.json());
  if (!pushHostOk(d.endpoint)) throw new HttpError(400, "This browser's push service is not supported");
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 200) || null;

  await db.pushSubscription.upsert({
    where: { endpoint: d.endpoint },
    update: { userId: actor.id, p256dh: d.keys.p256dh, auth: d.keys.auth, userAgent },
    create: { userId: actor.id, endpoint: d.endpoint, p256dh: d.keys.p256dh, auth: d.keys.auth, userAgent },
  });

  const all = await db.pushSubscription.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (all.length > MAX_DEVICES) {
    await db.pushSubscription.deleteMany({ where: { id: { in: all.slice(MAX_DEVICES).map((s) => s.id) } } });
  }
  return Response.json({ ok: true }, { status: 201 });
});

export const DELETE = route(async (req: Request) => {
  const actor = await requireUser();
  const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(await req.json());
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: actor.id } });
  return Response.json({ ok: true });
});
