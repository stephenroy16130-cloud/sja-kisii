const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();
const PASSWORD = "Password123!";
const HOUR = 3600000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const EAT = 3 * HOUR; // Nairobi is UTC+3 all year

function weekStartOf(date) {
  const local = new Date(date.getTime() + EAT);
  const back = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back) - EAT);
}

const USERS = [
  { key: "ds", email: "ds@test.com", username: "test_ds", fullName: "Test Superintendent", phone: "254700100001", isSuperintendent: true },
  { key: "admin", email: "admin@test.com", username: "test_admin", fullName: "Test DO Admin", phone: "254700100002", crewId: 1, titles: ["DO_ADMIN"] },
  { key: "finance", email: "finance@test.com", username: "test_finance", fullName: "Test DO Finance", phone: "254700100003", crewId: 2, titles: ["DO_FINANCE"] },
  { key: "ops", email: "ops@test.com", username: "test_ops", fullName: "Test DO Operations", phone: "254700100011", crewId: 3, titles: ["DO_OPERATIONS"] },
  { key: "dsm", email: "dsm@test.com", username: "test_dsm", fullName: "Test DSM", phone: "254700100012", crewId: 4, titles: ["DSM"] },
  { key: "trn", email: "training@test.com", username: "test_training", fullName: "Test DO Training", phone: "254700100013", crewId: 1, titles: ["DO_TRAINING"] },
  { key: "band", email: "band@test.com", username: "test_band", fullName: "Test Band Lead", phone: "254700100014", crewId: 2, titles: ["BAND_LEAD"] },
  { key: "s1", email: "sgt1@test.com", username: "test_sgt1", fullName: "Sgt Kevin Mwangi", phone: "254700100004", crewId: 1, titles: ["SERGEANT"] },
  { key: "s2", email: "sgt2@test.com", username: "test_sgt2", fullName: "Sgt Faith Njeri", phone: "254700100005", crewId: 2, titles: ["SERGEANT"] },
  { key: "m1", email: "member1@test.com", username: "test_member1", fullName: "Amina Wanjiru", phone: "254700100006", crewId: 1 },
  { key: "m2", email: "member2@test.com", username: "test_member2", fullName: "Brian Otieno", phone: "254700100007", crewId: 2 },
  { key: "m3", email: "member3@test.com", username: "test_member3", fullName: "Cynthia Achieng", phone: "254700100008", crewId: 3 },
  { key: "m4", email: "member4@test.com", username: "test_member4", fullName: "Dennis Kiprop", phone: "254700100009", crewId: 4, titles: ["BAND_MEMBER"] },
  { key: "m5", email: "member5@test.com", username: "test_member5", fullName: "Esther Nyaboke", phone: "254700100010", crewId: 1, titles: ["BAND_MEMBER"] },
];

// M = general meeting, F = field op, T = training. Who was present each week.
// Expected winners: wk-3 Amina (perfect week), wk-2 Dennis (tie-break), wk-1 Amina (2nd trophy), this week Cynthia leads.
const PLAN = {
  "-3": { M: ["m1", "m2", "m3", "m4", "m5", "s1", "s2"], F: ["m1", "m2"], T: ["m1"] },
  "-2": { M: ["m2", "m3"], F: ["m2", "m4"], T: ["m4"] },
  "-1": { M: ["m1", "m2", "m5", "s1"], F: ["m1"], T: ["m1", "m5"] },
  "0": { M: ["m3", "m1"], F: ["m3"], T: ["m3", "m5"] },
};
const ROSTER = ["m1", "m2", "m3", "m4", "m5", "s1", "s2"];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed test data in production");

  if (process.argv.includes("--disable")) {
    const r = await db.user.updateMany({ where: { email: { endsWith: "@test.com" } }, data: { status: "DISABLED" } });
    console.log("Disabled " + r.count + " test accounts.");
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const ids = {};
  for (const u of USERS) {
    const data = {
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      passwordHash,
      status: "ACTIVE",
      titles: u.titles || [],
      crewId: u.crewId || null,
      isSuperintendent: !!u.isSuperintendent,
    };
    ids[u.key] = await db.user.upsert({ where: { email: u.email }, update: data, create: { email: u.email, ...data } });
  }

  const now = new Date();
  const thisWeek = weekStartOf(now).getTime();

  // Reset previous demo data, then rebuild it relative to today
  await db.meeting.deleteMany({ where: { title: { startsWith: "[Demo]" } } });
  await db.fieldOp.deleteMany({ where: { title: { startsWith: "[Demo]" } } });
  await db.training.deleteMany({ where: { title: { startsWith: "[Demo]" } } });
  await db.weeklyResult.deleteMany({ where: { weekStart: { gte: new Date(thisWeek - 3 * WEEK) } } });

  // Keep this week's events in the past
  const at = (k, t, i) =>
    k === 0 ? new Date(Math.max(thisWeek + 60000, Math.min(t, now.getTime() - (i + 1) * 10 * 60000))) : new Date(t);

  for (const [kStr, plan] of Object.entries(PLAN)) {
    const k = Number(kStr);
    const ws = thisWeek + k * WEEK;
    const meeting = await db.meeting.create({
      data: { title: "[Demo] General Meeting", location: "Main hall", startsAt: at(k, ws + DAY + 10 * HOUR, 0), createdById: ids.admin.id },
    });
    const op = await db.fieldOp.create({
      data: { title: "[Demo] Field Operation", location: "Kisii town", startsAt: at(k, ws + 2 * DAY + 8 * HOUR, 1), allCrews: true, createdById: ids.admin.id },
    });
    const training = await db.training.create({
      data: {
        type: "DRILL", title: "[Demo] Drill Training", heldAt: at(k, ws + 3 * DAY + 16 * HOUR, 2),
        createdById: ids.admin.id, status: "VERIFIED", verifiedById: ids.admin.id, verifiedAt: new Date(),
      },
    });

    const rows = [];
    for (const key of ROSTER) {
      const u = ids[key];
      const base = { userId: u.id, crewId: u.crewId, recordedById: ids.admin.id };
      rows.push({ ...base, eventType: "MEETING", meetingId: meeting.id, status: plan.M.includes(key) ? "PRESENT" : "ABSENT" });
      rows.push({ ...base, eventType: "FIELD_OP", fieldOpId: op.id, status: plan.F.includes(key) ? "PRESENT" : "ABSENT" });
      rows.push({ ...base, eventType: "TRAINING", trainingId: training.id, status: plan.T.includes(key) ? "PRESENT" : "ABSENT" });
    }
    await db.attendanceRecord.createMany({ data: rows });
  }

  console.log("\nTest accounts. Password for all: " + PASSWORD);
  console.table(
    USERS.map((u) => ({
      email: u.email,
      role: (u.titles || []).join(", ") || (u.isSuperintendent ? "SUPERINTENDENT" : "MEMBER"),
      crew: u.crewId || "-",
    }))
  );
  console.log("Demo meetings, field ops, trainings and attendance created for the last 4 weeks.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
