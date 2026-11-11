import { redirect } from "next/navigation";
import AppAccess from "@/components/app-access";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { pushConfigured } from "@/lib/push";
import NotificationList from "./notification-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Keep it tidy: forget anything older than 60 days
  await db.notification
    .deleteMany({ where: { userId: user.id, createdAt: { lt: new Date(Date.now() - 60 * 86_400_000) } } })
    .catch(() => undefined);

  const rows = await db.notification
    .findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    })
    .catch(() => []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-white/50">
          Everything you are told about is kept here, so you never miss anything even if phone alerts are off.
        </p>
      </div>

      <NotificationList
        items={rows.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          url: r.url,
          read: r.readAt !== null,
          at: fmt(r.createdAt),
        }))}
      />

      <section>
        <h2 className="mb-3 text-xl font-light">Phone alerts</h2>
        {!pushConfigured() && (
          <p className="mb-4 rounded-2xl border border-warn/40 bg-card p-4 text-sm text-warn">
            Phone alerts are not switched on at the server yet, so only in-app notifications work. The administrator
            needs to add the push keys and redeploy.
          </p>
        )}
        <AppAccess mode="full" />
      </section>
    </div>
  );
}
