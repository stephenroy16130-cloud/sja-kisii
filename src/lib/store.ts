import type { OrderStatus } from "@prisma/client";

export const kes = (n: unknown) =>
  "KES " + Number(String(n)).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const orderWord: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  FULFILLED: "Collected",
};

export const orderTone: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-warn/50 text-warn",
  PAID: "border-gold/50 text-gold",
  CANCELLED: "border-white/20 text-white/40",
  FULFILLED: "border-ok/50 text-ok",
};

export type WindowState = "NOT_YET" | "OPEN" | "CLOSED";

export function windowState(opensAt: Date | null, closesAt: Date | null, now = new Date()): WindowState {
  if (opensAt && now < opensAt) return "NOT_YET";
  if (closesAt && now > closesAt) return "CLOSED";
  return "OPEN";
}

// Neon is far from Kenya, so give interactive transactions more room than the 5s default
export const TX_OPTS = { maxWait: 10000, timeout: 20000 };
