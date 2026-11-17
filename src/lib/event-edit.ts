import type { Audience } from "@prisma/client";
import { db } from "./db";
import type { QrEvent } from "./qr";
import { can, type AuthUser } from "./rbac";

// Verified training counts for points, so only DO Training (or the Band Lead, for band practice) can change it
export async function trainingLockReason(actor: AuthUser, id: string): Promise<string | null> {
  const t = await db.training.findUnique({ where: { id }, select: { status: true, type: true } });
  if (!t || t.status !== "VERIFIED") return null;
  if (can(actor, "training:verify")) return null;
  if (t.type === "BAND" && can(actor, "band:issue_instruments")) return null;
  return "This training has been verified, so only DO Training can change or delete it.";
}

// Who was told about an event, so they can be told when it changes or is cancelled
export function eventAudiences(e: Pick<QrEvent, "bandOnly" | "crewIds">): { audience: Audience; crewId: number | null }[] {
  if (e.bandOnly) return [{ audience: "BAND", crewId: null }];
  if (e.crewIds === null) return [{ audience: "GENERAL", crewId: null }];
  return e.crewIds.map((c) => ({ audience: "CREW" as const, crewId: c }));
}

export const EVENT_PATH = {
  meeting: "/dashboard/meetings/",
  fieldop: "/dashboard/fieldops/",
  training: "/dashboard/training/",
} as const;
