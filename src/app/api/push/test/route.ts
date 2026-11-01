import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyUsers, pushConfigured } from "@/lib/push";

export const POST = route(async () => {
  const actor = await requireUser();
  if (!pushConfigured()) throw new HttpError(503, "Push notifications are not set up on the server yet.");
  const n = await db.pushSubscription.count({ where: { userId: actor.id } });
  if (n === 0) throw new HttpError(409, "No device is registered yet. Turn on notifications first.");
  await notifyUsers([actor.id], {
    title: "St. John Ambulance",
    body: "Notifications are working on this device.",
    url: "/dashboard",
    tag: "test",
  });
  return Response.json({ sent: n });
});
