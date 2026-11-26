import { redirect } from "next/navigation";
import AssistantChat from "@/components/assistant-chat";
import { aiDailyLimit, aiEnabled, nairobiDayStart } from "@/lib/ai-config";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const KEEP_DAYS = 90; // chats older than this are deleted

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isDeveloper) redirect("/dashboard");

  const enabled = aiEnabled();
  const limit = aiDailyLimit();

  try {
    await db.aiChat.deleteMany({ where: { userId: user.id, updatedAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } });
  } catch {
    // not important
  }
  const [used, chats] = await Promise.all([
    enabled
      ? db.auditLog.count({ where: { actorId: user.id, action: "AI_ASK", createdAt: { gte: nairobiDayStart() } } })
      : Promise.resolve(0),
    db.aiChat.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true, updatedAt: true },
    }),
  ]);
  const first = (user.fullName.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Ask SJA</h1>
        <p className="mt-1 text-sm text-white/50">
          Questions about the division, the app, your points and events, or basic first aid.
        </p>
      </div>
      <AssistantChat
        firstName={first || "there"}
        enabled={enabled}
        limit={limit}
        left={Math.max(0, limit - used)}
        chats={chats.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() }))}
      />
    </div>
  );
}
