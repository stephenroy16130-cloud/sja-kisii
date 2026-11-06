import { headers } from "next/headers";

// The address that links in emails point to. In production it must be set, so it can never be spoofed.
export async function appUrl(): Promise<string> {
  const fixed = process.env.APP_URL?.replace(/\/$/, "");
  if (fixed) return fixed;
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set");
  const h = await headers();
  return `http://${h.get("host") ?? "localhost:3000"}`;
}
