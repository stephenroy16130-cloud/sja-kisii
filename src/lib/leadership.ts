import { db } from "./db";

// When true, the Superintendent can no longer promote or create leader accounts (demotion still works)
export async function leadershipLocked() {
  const s = await db.systemSetting.findUnique({ where: { key: "leadershipLocked" } });
  return s?.value === true;
}
