const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const fix = (s) => s.trim().replace(/\s+/g, " ").toUpperCase().replace(/\/(?:19|20)(\d{2})$/, "/$1");
const ok = (s) => s.length <= 30 && /^[A-Z0-9][A-Z0-9/\-. ]*\/\d{2}$/.test(s);

(async () => {
  const apply = process.argv.includes("--apply");
  const rows = await db.user.findMany({
    where: { admissionNumber: { not: null } },
    select: { id: true, fullName: true, admissionNumber: true },
  });
  const changes = rows.map((r) => ({ ...r, next: fix(r.admissionNumber) })).filter((r) => r.next !== r.admissionNumber);
  const odd = rows.filter((r) => !ok(fix(r.admissionNumber)));

  console.log(rows.length + " admission numbers saved. " + changes.length + " to change to the two-digit year.");
  changes.slice(0, 25).forEach((r) => console.log("  " + r.admissionNumber + "  ->  " + r.next + "   (" + r.fullName + ")"));
  if (odd.length) {
    console.log("\nThese do not end with a two-digit year, so check them by hand:");
    odd.forEach((r) => console.log("  " + r.admissionNumber + "   (" + r.fullName + ")"));
  }
  if (!apply) {
    console.log("\nDRY RUN. Add --apply to make the changes.");
    return;
  }
  let done = 0;
  for (const r of changes) {
    try {
      await db.user.update({ where: { id: r.id }, data: { admissionNumber: r.next } });
      done++;
    } catch (e) {
      console.log("Could not change " + r.admissionNumber + " (" + (e.code || "error") + "). Probably the new value already exists.");
    }
  }
  console.log("\nChanged " + done + ".");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
