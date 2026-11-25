import { redirect } from "next/navigation";
import AssistantChat from "@/components/assistant-chat";
import { aiDailyLimit, aiEnabled, nairobiDayStart } from "@/lib/ai-config";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isDeveloper) redirect("/dashboard");

  const enabled = aiEnabled();
  const limit = aiDailyLimit();
  const used = enabled
    ? await db.auditLog.count({ where: { actorId: user.id, action: "AI_ASK", createdAt: { gte: nairobiDayStart() } } })
    : 0;
  const first = (user.fullName.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  // Only the DO Admin sees why it is off
  let hint = "";
  if (!enabled && can(user, "user:manage_accounts")) {
    const env = process.env.VERCEL_ENV ?? "local";
    if (process.env.AI_ENABLED === "false") {
      hint = `Admin note: AI_ENABLED is set to "false" on this deployment (environment: ${env}).`;
    } else if (!process.env.OPENAI_API_KEY) {
      hint = `Admin note: OPENAI_API_KEY is not set on this deployment (environment: ${env}). In Vercel open Settings, then Environment Variables, add it with Production ticked, and redeploy.`;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Ask SJA</h1>
        <p className="mt-1 text-sm text-white/50">
          Questions about the division, the app, your points and events, or basic first aid.
        </p>
      </div>
      {hint && <p className="rounded-2xl border border-warn/40 bg-card p-4 text-sm text-warn">{hint}</p>}
      <AssistantChat firstName={first || "there"} enabled={enabled} limit={limit} left={Math.max(0, limit - used)} />
    </div>
  );
}
