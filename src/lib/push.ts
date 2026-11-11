import type { Audience, Prisma, Title } from "@prisma/client";
import webpush from "web-push";
import { BAND_TITLES } from "./band";
import { db } from "./db";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let ready = false;
export function pushConfigured() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  ready = true;
  return true;
}

// Only real browser push services are accepted, so nobody can point the server at another address
export function pushHostOk(endpoint: string) {
  try {
    const u = new URL(endpoint);
    const h = u.hostname;
    return (
      u.protocol === "https:" &&
      (h === "fcm.googleapis.com" ||
        h === "updates.push.services.mozilla.com" ||
        h.endsWith(".push.services.mozilla.com") ||
        h.endsWith(".push.apple.com") ||
        h.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}

const safeUrl = (u?: string) => (u && u.startsWith("/") && !u.startsWith("//") ? u : "/dashboard");

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

async function deliver(subs: Sub[], payload: PushPayload) {
  if (!pushConfigured() || subs.length === 0) return;
  const body = JSON.stringify({
    title: payload.title.slice(0, 80),
    body: payload.body.slice(0, 160),
    url: safeUrl(payload.url),
    tag: payload.tag,
  });
  const dead: string[] = [];
  for (let i = 0; i < subs.length; i += 20) {
    await Promise.all(
      subs.slice(i, i + 20).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            TTL: 86_400,
          });
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.id); // the device unsubscribed or was uninstalled
        }
      })
    );
  }
  if (dead.length) await db.pushSubscription.deleteMany({ where: { id: { in: dead } } });
}

// The in-app copy, so the alert is always visible in the Notifications page and on the bell
async function record(userIds: string[], p: PushPayload) {
  try {
    await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: p.title.slice(0, 120),
        body: p.body.slice(0, 300),
        url: safeUrl(p.url),
      })),
    });
  } catch (e) {
    console.error("could not save notifications", e);
  }
}

// Never throws: a failed notification must not break the action that caused it
export async function notifyUsers(userIds: string[], payload: PushPayload) {
  try {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return;
    await record(ids, payload);
    const subs = await db.pushSubscription.findMany({ where: { userId: { in: ids } } });
    await deliver(subs, payload);
  } catch (e) {
    console.error("push failed", e);
  }
}

const BAND_VISIBLE: Title[] = [...BAND_TITLES, "DO_TRAINING", "DO_ADMIN"];

// Everyone who can see content with this audience, except the author
export async function notifyAudience(audience: Audience, crewId: number | null, payload: PushPayload, exceptUserId?: string) {
  try {
    if (audience === "CREW" && crewId === null) return;
    const where: Prisma.UserWhereInput = {
      status: "ACTIVE",
      isDeveloper: false,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
      ...(audience === "CREW" ? { crewId } : {}),
      ...(audience === "BAND" ? { titles: { hasSome: BAND_VISIBLE } } : {}),
    };
    const users = await db.user.findMany({ where, select: { id: true } });
    await notifyUsers(users.map((u) => u.id), payload);
  } catch (e) {
    console.error("push failed", e);
  }
}

// Everyone holding one of these titles, for things that need a leader's decision
export async function notifyTitles(titles: Title[], payload: PushPayload, exceptUserId?: string) {
  try {
    const users = await db.user.findMany({
      where: {
        status: "ACTIVE",
        isDeveloper: false,
        titles: { hasSome: titles },
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
      },
      select: { id: true },
    });
    await notifyUsers(users.map((u) => u.id), payload);
  } catch (e) {
    console.error("push failed", e);
  }
}
