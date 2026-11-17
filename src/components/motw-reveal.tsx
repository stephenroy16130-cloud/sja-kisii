import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { displayName, socialPhoto } from "@/lib/profile";
import { firstField } from "@/lib/schema-info";
import MotwRevealClient from "./motw-reveal-client";

const WINDOW_MS = 28 * 86_400_000; // a win older than four weeks is no longer revealed

// Only the winner, only when they have not seen it yet, and only once the week has been finalised
export default async function MotwReveal() {
  try {
    const user = await getCurrentUser();
    if (!user || user.isDeveloper || !user.hasCompletedOnboarding) return null;

    const field = firstField("WeeklyResult", ["winnerId", "userId"]);
    if (!field) return null;

    const row = await db.weeklyResult.findFirst({
      where: {
        [field]: user.id,
        isMotwRevealed: false,
        weekStart: { gte: new Date(Date.now() - WINDOW_MS) },
      } as unknown as Prisma.WeeklyResultWhereInput,
      orderBy: { weekStart: "desc" },
      select: { id: true, weekStart: true },
    });
    if (!row) return null;

    const week = new Date(row.weekStart).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      timeZone: "Africa/Nairobi",
    });

    return (
      <MotwRevealClient
        resultId={row.id}
        name={displayName({ fullName: user.fullName, preferredName: user.preferredName })}
        photo={socialPhoto(user)}
        crew={user.crewId ? crewName(user.crewId) : ""}
        color={crewColor(user.crewId)}
        week={week}
      />
    );
  } catch (err) {
    console.error("[MotwReveal] Error loading reveal modal:", err);
    return null;
  }
}
