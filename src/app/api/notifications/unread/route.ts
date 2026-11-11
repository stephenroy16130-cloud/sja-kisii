import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const actor = await requireUser();
  const [unread, latest] = await Promise.all([
    db.notification.count({ where: { userId: actor.id, readAt: null } }),
    db.notification.findFirst({
      where: { userId: actor.id, readAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true },
    }),
  ]);
  return Response.json({ unread, latest }, { headers: { "Cache-Control": "no-store" } });
});
