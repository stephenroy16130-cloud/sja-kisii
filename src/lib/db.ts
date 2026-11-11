import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes(".neon.tech") && !url.includes("-pooler.")) {
    return url.replace(".neon.tech", "-pooler.neon.tech");
  }
  return url;
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
if (process.env.NODE_ENV !== "production") g.prisma = db;
