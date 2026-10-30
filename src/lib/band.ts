import type { InstrumentStatus, Title } from "@prisma/client";
import { can, type AuthUser } from "./rbac";

export const BAND_TITLES: Title[] = ["BAND_MEMBER", "BAND_LEAD"];

export const statusWord: Record<InstrumentStatus, string> = {
  AVAILABLE: "Available",
  ISSUED: "Issued",
  LOST: "Lost",
  DAMAGED: "Damaged",
};

export const statusTone: Record<InstrumentStatus, string> = {
  AVAILABLE: "border-ok/50 text-ok",
  ISSUED: "border-gold/50 text-gold",
  LOST: "border-bad/50 text-bad",
  DAMAGED: "border-warn/50 text-warn",
};

// Band Lead and DO Training manage inventory. Only the Band Lead issues and receives instruments.
export const canManageInventory = (u: AuthUser) => can(u, "band:oversee") || can(u, "band:issue_instruments");
export const canIssue = (u: AuthUser) => can(u, "band:issue_instruments");
export const inBand = (u: AuthUser) => u.titles.includes("BAND_MEMBER") || u.titles.includes("BAND_LEAD");
export const canSeeBand = (u: AuthUser) => canManageInventory(u) || inBand(u);
