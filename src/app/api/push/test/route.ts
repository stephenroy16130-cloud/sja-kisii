import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { notifyUsers, pushConfigured } from "@/lib/push";

export const POST = route(async () => {
  const actor = await requireUser();
  const devices = await db.pushSubscription.count({ where: { userId: actor.id } });
  // Always saved in the app. Also sent to the phone when one is registered.
  await notifyUsers([actor.id], {
    title: "St. John Ambulance",
    body: "Notifications are working.",
    url: "/dashboard/notifications",
    tag: "test",
  });
  return Response.json({ devices, configured: pushConfigured() });
});
