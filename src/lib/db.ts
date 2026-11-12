import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    // If it's a Neon database connection
    if (u.hostname.includes("neon.tech")) {
      const parts = u.hostname.split(".");
      // If the first subdomain part does not already have -pooler, add -pooler to connect via Neon's connection pooler
      if (!parts[0].endsWith("-pooler")) {
        parts[0] = `${parts[0]}-pooler`;
        u.hostname = parts.join(".");
      }
      // Ensure pgbouncer transaction pooling mode is respected by Prisma
      if (!u.searchParams.has("pgbouncer")) {
        u.searchParams.set("pgbouncer", "true");
      }
      if (!u.searchParams.has("connect_timeout")) {
        u.searchParams.set("connect_timeout", "15");
      }
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

const g = globalThis as unknown as { prisma?: PrismaClient };
const dbUrl = getDatabaseUrl();

export const db =
  g.prisma ??
  new PrismaClient(
    dbUrl
      ? {
          datasources: { db: { url: dbUrl } },
        }
      : undefined
  );

// Cache on globalThis in both development and production (critical for serverless / lambda reuse)
g.prisma = db;
