import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLeaderUser } from "@/lib/leaders";

// On a meeting page: members get "not found" for a leaders-only meeting, and leaders see a label
export default async function MeetingAudienceGate({ id }: { id: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const m = await db.meeting.findUnique({ where: { id }, select: { leadersOnly: true } });
  if (!m?.leadersOnly) return null;
  if (!isLeaderUser(user)) notFound();
  return (
    <p className="rounded-2xl border border-gold/40 bg-card px-5 py-3 text-xs uppercase tracking-[0.15em] text-gold">
      Leaders only
    </p>
  );
}
