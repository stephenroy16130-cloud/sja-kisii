import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";
import { can, type Permission } from "./rbac";
import { readSessionUserId } from "./session";

// Always reads from the DB so a demotion/suspension takes effect immediately
export const getCurrentUser = cache(async () => {
  const id = await readSessionUserId();
  if (!id) return null;

  const select = {
    id: true, username: true, fullName: true, email: true, status: true,
    titles: true, isSuperintendent: true, isDeveloper: true, crewId: true,
    preferredName: true, socialPhotoAt: true, mustChangePassword: true,
    dateOfBirth: true, gender: true, idType: true, idNumber: true,
    hasCompletedOnboarding: true,
  } as const;

  let u;
  try {
    u = await db.user.findUnique({ where: { id }, select });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("connection pool") || msg.includes("connect_timeout") || msg.includes("P1001")) {
      console.warn("[auth] Cold start retry for user session...");
      await new Promise((r) => setTimeout(r, 1500));
      u = await db.user.findUnique({ where: { id }, select });
    } else {
      throw err;
    }
  }

  if (!u || u.status !== "ACTIVE") return null;
  const { dateOfBirth, gender, idType, idNumber, ...rest } = u;
  return {
    ...rest,
    has_completed_onboarding: u.hasCompletedOnboarding,
    profileComplete: Boolean(dateOfBirth && gender && idType && idNumber),
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not authenticated");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user, permission)) throw new HttpError(403, "You do not have permission to do this");
  return user;
}

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Prisma.InputJsonObject
) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, metadata } });
}
