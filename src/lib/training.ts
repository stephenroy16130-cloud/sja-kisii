import type { TrainingType, VerificationStatus } from "@prisma/client";
import { can, type AuthUser } from "./rbac";

export const typeLabel: Record<TrainingType, string> = { DRILL: "Drill", FIRST_AID: "First Aid" };

export const statusWord: Record<VerificationStatus, string> = {
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const statusTone: Record<VerificationStatus, string> = {
  PENDING: "border-warn/50 text-warn",
  VERIFIED: "border-ok/50 text-ok",
  REJECTED: "border-bad/50 text-bad",
};

// DO Training can create both types. DSM creates Drills. Sergeant/Corporal create First Aid.
export function allowedTypes(user: AuthUser): TrainingType[] {
  const verifier = can(user, "training:verify");
  const out: TrainingType[] = [];
  if (verifier || can(user, "training:create_drill")) out.push("DRILL");
  if (verifier || can(user, "training:create_first_aid")) out.push("FIRST_AID");
  return out;
}
