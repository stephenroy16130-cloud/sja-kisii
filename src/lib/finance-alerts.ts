import { z } from "zod";
import { db } from "./db";
import { mailConfigured, sendMail } from "./mail";
import { notifyUsers, pushConfigured } from "./push";

export const AlertSettings = z.object({
  push: z.boolean().default(true),
  email: z.string().trim().max(120).default(""),
  whatsapp: z.string().trim().max(20).default(""),
  scope: z.enum(["all", "shop"]).default("all"),
});
export type AlertSettingsT = z.infer<typeof AlertSettings>;
export const DEFAULT_ALERTS: AlertSettingsT = { push: true, email: "", whatsapp: "", scope: "all" };

export async function getAlertSettings(): Promise<AlertSettingsT> {
  const s = await db.systemSetting.findUnique({ where: { key: "financeAlerts" } });
  const r = AlertSettings.safeParse(s?.value ?? {});
  return r.success ? r.data : DEFAULT_ALERTS;
}

export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

// Kenyan or international numbers, stored as digits only, for example 254712345678
export function normalizeWhatsapp(raw: string): string | null {
  const d = raw.replace(/[^\d]/g, "");
  if (!d) return "";
  const full = d.startsWith("0") ? "254" + d.slice(1) : /^[71]\d{8}$/.test(d) ? "254" + d : d;
  return /^\d{11,15}$/.test(full) ? full : null;
}

const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 120);

// Uses Meta's WhatsApp Business Cloud API with an approved template (see the setup notes)
async function sendWhatsApp(to: string, name: string, what: string, amount: string) {
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE ?? "payment_alert",
        language: { code: process.env.WHATSAPP_LANG ?? "en" },
        components: [
          { type: "body", parameters: [name, what, amount].map((text) => ({ type: "text", text: oneLine(text) })) },
        ],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? `WhatsApp error ${res.status}`);
  }
}

export type AlertReport = { push: string; email: string; whatsapp: string };

export async function alertFinance(
  a: { name: string; what: string; amount: string; receipt?: string | null },
  settings?: AlertSettingsT
): Promise<AlertReport> {
  const cfg = settings ?? (await getAlertSettings());
  const report: AlertReport = { push: "off", email: "off", whatsapp: "off" };
  const line = `${a.name} paid ${a.amount} for ${a.what}${a.receipt ? ` (${a.receipt})` : ""}`;

  if (cfg.push) {
    try {
      if (!pushConfigured()) {
        report.push = "not set up on the server";
      } else {
        const users = await db.user.findMany({
          where: { status: "ACTIVE", titles: { has: "DO_FINANCE" } },
          select: { id: true },
        });
        const ids = users.map((u) => u.id);
        const devices = ids.length ? await db.pushSubscription.count({ where: { userId: { in: ids } } }) : 0;
        if (devices === 0) {
          report.push = "no DO Finance device has notifications turned on";
        } else {
          await notifyUsers(ids, { title: "Payment received", body: line, url: "/dashboard/finance" });
          report.push = `sent to ${devices} device(s)`;
        }
      }
    } catch {
      report.push = "failed";
    }
  }

  if (cfg.email) {
    if (!mailConfigured()) {
      report.email = "email is not set up on the server";
    } else {
      try {
        await sendMail(cfg.email, "Payment received", `${line}.\n\nOpen the Finance page for details.`);
        report.email = "sent";
      } catch (e) {
        report.email = "failed: " + (e instanceof Error ? e.message.slice(0, 80) : "error");
      }
    }
  }

  if (cfg.whatsapp) {
    if (!whatsappConfigured()) {
      report.whatsapp = "WhatsApp is not set up on the server";
    } else {
      try {
        await sendWhatsApp(cfg.whatsapp, a.name, a.what, a.amount);
        report.whatsapp = "sent";
      } catch (e) {
        report.whatsapp = "failed: " + (e instanceof Error ? e.message.slice(0, 120) : "error");
      }
    }
  }
  return report;
}

// Called after an M-Pesa payment is confirmed. Never throws.
export async function notifyFinancePayment(txId: string): Promise<void> {
  try {
    const s = await getAlertSettings();
    if (!s.push && !s.email && !s.whatsapp) return;
    const t = await db.transaction.findUnique({
      where: { id: txId },
      include: {
        user: { select: { fullName: true } },
        order: { select: { items: { select: { quantity: true, item: { select: { name: true } } } } } },
        announcement: { select: { title: true } },
      },
    });
    if (!t || t.status !== "SUCCESS") return;
    if (s.scope === "shop" && t.purpose !== "STORE_ORDER") return;

    let what = "a payment";
    if (t.purpose === "STORE_ORDER") {
      what = t.order?.items.map((i) => `${i.quantity} x ${i.item.name}`).join(", ") || "a shop order";
    } else if (t.purpose === "REGISTRATION_FEE") {
      what = "the registration fee";
    } else if (t.purpose === "CREW_EVENT") {
      what = t.announcement?.title ?? "a crew event";
    } else if (t.purpose === "COLLECTION" && t.collectionId) {
      const c = await db.collection.findUnique({ where: { id: t.collectionId }, select: { title: true } });
      what = c?.title ?? "a payment activity";
    }
    const amount = `KES ${Number(String(t.amount)).toLocaleString("en-KE")}`;
    await alertFinance({ name: t.user.fullName, what, amount, receipt: t.mpesaReceipt }, s);
  } catch (e) {
    console.error("Payment alert failed", e);
  }
}
