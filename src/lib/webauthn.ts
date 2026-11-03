import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { HttpError } from "./http";

export const RP_NAME = "St. John Ambulance Kisii";
const COOKIE = "sja_webauthn";
const PATH = "/api/passkeys";
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

// The site address the browser is using. Passkeys are tied to it.
export async function rp() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (!host) throw new HttpError(400, "Could not determine the site address");
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return { id: host.replace(/:\d+$/, ""), origin: `${local ? "http" : "https"}://${host}` };
}

// The one-time challenge travels in a short-lived, signed, httpOnly cookie
export async function saveChallenge(kind: "reg" | "auth", challenge: string, userId?: string) {
  const token = await new SignJWT({ k: kind, c: challenge })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId ?? "anon")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: PATH,
    maxAge: 300,
  });
}

export async function takeChallenge(kind: "reg" | "auth", userId?: string): Promise<string> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.set(COOKIE, "", { path: PATH, maxAge: 0 }); // single use
  const expired = new HttpError(400, "This attempt expired. Please try again.");
  if (!token) throw expired;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.k !== kind || payload.sub !== (userId ?? "anon") || typeof payload.c !== "string") throw expired;
    return payload.c;
  } catch {
    throw expired;
  }
}

export function deviceLabel(ua: string | null) {
  const s = ua ?? "";
  if (/iphone|ipad/i.test(s)) return "iPhone or iPad";
  if (/android/i.test(s)) return "Android phone";
  if (/windows/i.test(s)) return "Windows computer";
  if (/macintosh|mac os/i.test(s)) return "Mac";
  return "This device";
}
