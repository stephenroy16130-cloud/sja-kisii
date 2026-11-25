import { redirect } from "next/navigation";
import AssistantChat from "@/components/assistant-chat";
import { aiDailyLimit, aiEnabled, nairobiDayStart } from "@/lib/ai-config";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const enabled = aiEnabled();
  const limit = aiDailyLimit();
  const used = enabled
    ? await db.auditLog.count({ where: { actorId: user.id, action: "AI_ASK", createdAt: { gte: nairobiDayStart() } } })
    : 0;
  const first = (user.fullName.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Ask SJA</h1>
        <p className="mt-1 text-sm text-white/50">
          Questions about the division, the app, your points and events, or basic first aid.
        </p>
      </div>
      <AssistantChat firstName={first || "there"} enabled={enabled} limit={limit} left={Math.max(0, limit - used)} />
    </div>
  );
}
