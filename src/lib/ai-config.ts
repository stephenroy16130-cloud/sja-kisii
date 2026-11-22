export const aiKey = () => process.env.OPENROUTER_API_KEY ?? "";
export const aiEnabled = () => Boolean(aiKey()) && process.env.AI_ENABLED !== "false";
export const aiModel = () => process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-5-mini";

export function aiDailyLimit(): number {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 25;
}

// Midnight in Nairobi (three hours ahead of UTC)
export function nairobiDayStart(now = Date.now()): Date {
  const EAT = 3 * 3_600_000;
  const DAY = 86_400_000;
  return new Date(Math.floor((now + EAT) / DAY) * DAY - EAT);
}
