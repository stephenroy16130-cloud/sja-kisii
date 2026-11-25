export const aiKey = () => (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "").trim();
export const aiEnabled = () => Boolean(aiKey()) && process.env.AI_ENABLED !== "false";

export function isDirectOpenAi(): boolean {
  const k = aiKey();
  return Boolean(k) && !k.startsWith("sk-or-");
}

export function aiModel(): string {
  if (process.env.OPENROUTER_MODEL?.trim()) return process.env.OPENROUTER_MODEL.trim();
  if (process.env.OPENAI_MODEL?.trim()) return process.env.OPENAI_MODEL.trim();
  return isDirectOpenAi() ? "gpt-4o-mini" : "openai/gpt-5-mini";
}

export function aiEndpoint(): string {
  if (process.env.AI_ENDPOINT?.trim()) return process.env.AI_ENDPOINT.trim();
  return isDirectOpenAi() ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
}

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
