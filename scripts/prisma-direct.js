const fs = require("fs");
const { spawnSync } = require("child_process");

function readUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const m = fs.readFileSync(".env", "utf8").match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (m) return m[1];
  } catch {
    // no .env here
  }
  return null;
}

const raw = readUrl();
if (!raw) {
  console.error("DATABASE_URL was not found.");
  process.exit(1);
}

// Migrations cannot run through the pooled address, so use the direct one
const u = new URL(raw);
u.hostname = u.hostname.replace("-pooler", "");
u.searchParams.delete("channel_binding");
u.searchParams.set("sslmode", "require");
u.searchParams.set("connect_timeout", "30");
console.error("Prisma will use the direct database address: " + u.hostname);

const r = spawnSync("npx", ["prisma", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: u.toString() },
});
process.exit(r.status === null ? 1 : r.status);
