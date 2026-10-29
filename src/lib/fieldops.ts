import type { Title } from "@prisma/client";
import { hasStarted } from "./meetings";

export const LEADER_TITLES: Title[] = ["CORPORAL", "SERGEANT"];
const OPEN_ENDED_HOURS = 6;

export type OpPhase = "UPCOMING" | "LIVE" | "PAST";

// An operation with no end time counts as live for 6 hours after it starts
export function opPhase(startsAt: Date, endsAt: Date | null, now = new Date()): OpPhase {
  if (!hasStarted(startsAt, now)) return "UPCOMING";
  const end = endsAt ?? new Date(startsAt.getTime() + OPEN_ENDED_HOURS * 3_600_000);
  return now < end ? "LIVE" : "PAST";
}

export const targetCrewIds = (op: { allCrews: boolean; crews: { id: number }[] }) =>
  op.allCrews ? [1, 2, 3, 4] : op.crews.map((c) => c.id).sort((a, b) => a - b);
