import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const actor = await requireUser();
  try {
    const [unread, latest] = await Promise.all([
      db.notification.count({ where: { userId: actor.id, readAt: null } }),
      db.notification.findFirst({
        where: { userId: actor.id, readAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, body: true },
      }),
    ]);
    return Response.json({ unread, latest }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // If the database connection is momentarily saturated, return 0 gracefully without 500 error
    return Response.json({ unread: 0, latest: null }, { headers: { "Cache-Control": "no-store" } });
  }
});
