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
  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, fullName: true, email: true, status: true,
      titles: true, isSuperintendent: true, isDeveloper: true, crewId: true,
      preferredName: true, socialPhotoAt: true,
      dateOfBirth: true, gender: true, idType: true, idNumber: true,
    },
  });
  if (!u || u.status !== "ACTIVE") return null;
  const { dateOfBirth, gender, idType, idNumber, ...rest } = u;
  return { ...rest, profileComplete: Boolean(dateOfBirth && gender && idType && idNumber) };
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
