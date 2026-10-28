import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  for (const id of [1, 2, 3, 4]) {
    await db.crew.upsert({ where: { id }, update: {}, create: { id, name: `Crew ${id}` } });
  }

  await db.systemSetting.upsert({
    where: { key: "registrationOpen" },
    update: {},
    create: { key: "registrationOpen", value: false },
  });

  const { DEV_USERNAME, DEV_EMAIL, DEV_PHONE, DEV_PASSWORD } = process.env;
  if (!DEV_USERNAME || !DEV_EMAIL || !DEV_PHONE || !DEV_PASSWORD) {
    throw new Error("Missing DEV_* variables in .env");
  }

  const hasSuperintendent = await db.user.count({ where: { isSuperintendent: true } });
  const existingDev = await db.user.findFirst({ where: { isDeveloper: true } });

  // Only (re)create the developer account while no Superintendent exists
  if (!existingDev && hasSuperintendent === 0) {
    await db.user.create({
      data: {
        username: DEV_USERNAME.toLowerCase(),
        email: DEV_EMAIL.toLowerCase(),
        phone: DEV_PHONE,
        fullName: "System Developer",
        passwordHash: await bcrypt.hash(DEV_PASSWORD, 12),
        status: "ACTIVE",
        isDeveloper: true,
      },
    });
  }
  console.log("Seed complete.");
}

main().finally(() => db.$disconnect());
