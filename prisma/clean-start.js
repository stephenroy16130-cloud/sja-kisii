const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const removeTest = args.includes("--remove-test-accounts");
const confirm = (args.find((a) => a.startsWith("--confirm=")) || "").slice(10);

// A document whose title contains "manual" is kept
const MANUAL = { title: { contains: "manual", mode: "insensitive" } };

// In an order that never leaves something pointing at a record that is gone
const WIPE = [
  "attendanceRecord",
  "checkIn",
  "apology",
  "eventLink",
  "announcementRsvp",
  "membershipRequest",
  "transaction",
  "orderItem",
  "order",
  "collection",
  "announcement",
  "meeting",
  "fieldOp",
  "training",
  "instrumentIssuanceLog",
  "bandInstrument",
  "item",
  "article",
  "weeklyResult",
  "notification",
  "passwordResetToken",
];

const hostCode = () => {
  try {
    return new URL(process.env.DATABASE_URL || "").hostname.slice(0, 8);
  } catch {
    return "unknown";
  }
};

async function count(name, where) {
  try {
    return db[name] ? await db[name].count(where ? { where } : undefined) : null;
  } catch {
    return null;
  }
}

(async () => {
  const code = hostCode();
  console.log("\nDatabase: " + code + "...");

  const users = await db.user.count();
  const testUsers = await db.user.count({ where: { email: { endsWith: "@test.com" } } });
  const keptDocs = await db.document.findMany({ where: MANUAL, select: { title: true } });
  const docsGoing = await db.document.count({ where: { NOT: MANUAL } });

  console.log("\nKEPT");
  console.log("  accounts: " + users + (testUsers ? " (" + testUsers + " of them are @test.com accounts)" : ""));
  console.log("  documents kept: " + (keptDocs.map((d) => d.title).join(", ") || "none"));
  console.log("  crews and settings: untouched");

  console.log("\nTO BE DELETED");
  for (const n of WIPE) {
    const c = await count(n);
    console.log("  " + n.padEnd(24) + (c === null ? "(not in this database)" : c));
  }
  console.log("  " + "documents".padEnd(24) + docsGoing);
  console.log("  " + "storedFile".padEnd(24) + (await count("storedFile")) + " (minus any used by kept documents)");
  console.log("  " + "auditLog".padEnd(24) + (await count("auditLog")));

  let ds = null;
  if (removeTest) {
    ds = await db.user.findFirst({
      where: { isSuperintendent: true, NOT: { email: { endsWith: "@test.com" } } },
      select: { id: true, fullName: true },
    });
    console.log("\n--remove-test-accounts: " + testUsers + " @test.com accounts would also be deleted.");
    if (!ds) {
      console.log("No real Divisional Superintendent account was found, so I will not remove the test accounts. Stopping.");
      return;
    }
  } else if (testUsers) {
    console.log("\nThe " + testUsers + " @test.com accounts are kept. Add --remove-test-accounts to delete them too.");
  }

  if (!apply) {
    console.log("\nDRY RUN. Nothing was changed.");
    console.log("To do it for real:  --apply --confirm=" + code);
    return;
  }
  if (confirm !== code) {
    console.log("\nNot done. Add --confirm=" + code + " to confirm this is the database you mean.");
    return;
  }

  // Remember the stored files of documents being deleted, to remove them from storage afterwards
  const blobPaths = (await db.document.findMany({ where: { NOT: MANUAL }, select: { fileUrl: true } }))
    .map((d) => d.fileUrl)
    .filter((u) => u.startsWith("blob:"))
    .map((u) => u.slice(5));

  console.log("\nDeleting...");
  await db.$transaction(
    async (tx) => {
      for (const n of WIPE) {
        if (!tx[n]) continue;
        const r = await tx[n].deleteMany({});
        console.log("  " + n.padEnd(24) + r.count + " deleted");
      }
      const d = await tx.document.deleteMany({ where: { NOT: MANUAL } });
      console.log("  " + "documents".padEnd(24) + d.count + " deleted");

      const kept = await tx.document.findMany({ select: { fileUrl: true } });
      const keepIds = kept.map((x) => (/^\/api\/files\/(.+)$/.exec(x.fileUrl) || [])[1]).filter(Boolean);
      const f = await tx.storedFile.deleteMany({ where: { id: { notIn: keepIds } } });
      console.log("  " + "storedFile".padEnd(24) + f.count + " deleted");

      const a = await tx.auditLog.deleteMany({});
      console.log("  " + "auditLog".padEnd(24) + a.count + " deleted");

      if (removeTest) {
        const testIds = (await tx.user.findMany({ where: { email: { endsWith: "@test.com" } }, select: { id: true } })).map((u) => u.id);
        await tx.document.updateMany({ where: { uploadedById: { in: testIds } }, data: { uploadedById: ds.id } });
        const u = await tx.user.deleteMany({ where: { id: { in: testIds } } });
        console.log("  " + "test accounts".padEnd(24) + u.count + " deleted");
      }
      await tx.auditLog.create({ data: { action: "SYSTEM_CLEANED", entity: "System" } });
    },
    { timeout: 180_000, maxWait: 20_000 }
  );

  if (blobPaths.length) {
    let del = null;
    try {
      del = require("@vercel/blob").del;
    } catch {
      // not available here
    }
    if (del && process.env.BLOB_READ_WRITE_TOKEN) {
      let ok = 0;
      for (const p of blobPaths) {
        try {
          await del(p);
          ok++;
        } catch {
          // leave it
        }
      }
      console.log("\nRemoved " + ok + " of " + blobPaths.length + " uploaded files from storage.");
    } else {
      console.log("\n" + blobPaths.length + " uploaded files are still in Vercel Blob storage. They are harmless and unreachable;");
      console.log("you can delete them in Vercel, under Storage, then your Blob store.");
    }
  }

  console.log("\nDone. The system is empty and ready. Accounts, crews and settings are as they were.");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
