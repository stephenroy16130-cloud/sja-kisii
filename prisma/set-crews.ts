import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const names: Record<number, string> = {
  1: "The Fiery Knights",
  2: "The Great Amalfi",
  3: "The Royal Duke",
  4: "The Mighty Malta",
};

async function main() {
  for (const [id, name] of Object.entries(names)) {
    await db.crew.update({ where: { id: Number(id) }, data: { name } });
  }
  console.log("Crew names updated.");
}

main().finally(() => db.$disconnect());
