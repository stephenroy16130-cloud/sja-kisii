import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const POST = route(async () => {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { hasCompletedOnboarding: true },
  });
  return Response.json({
    success: true,
    has_completed_onboarding: true,
    hasCompletedOnboarding: true,
  });
});

