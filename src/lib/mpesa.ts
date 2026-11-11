import { after } from "next/server";
import { notifyPaymentSuccess } from "./payment-notify";
import { Prisma, type TransactionPurpose, type TransactionStatus } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";
import { TX_OPTS } from "./store";

const PRODUCTION = process.env.MPESA_ENV === "production";
const BASE = PRODUCTION ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

// A prompt stays valid for about a minute. After 2 minutes we treat it as no longer "in progress".
export const IN_PROGRESS_MS = 120_000;

export const PURPOSE_WORD: Record<TransactionPurpose, string> = {
  REGISTRATION_FEE: "Registration fee",
  STORE_ORDER: "Shop order",
  CREW_EVENT: "Crew event",
  COLLECTION: "Activity payment",
};
export const TX_WORD: Record<TransactionStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};
export const TX_TONE: Record<TransactionStatus, string> = {
  PENDING: "border-warn/50 text-warn",
  SUCCESS: "border-ok/50 text-ok",
  FAILED: "border-bad/50 text-bad",
  CANCELLED: "border-white/20 text-white/50",
};

function config() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const baseUrl = process.env.MPESA_CALLBACK_BASE_URL;
  const hook = process.env.MPESA_CALLBACK_SECRET;
  if (!key || !secret || !shortcode || !passkey || !baseUrl || !hook) {
    throw new HttpError(503, "M-Pesa is not set up yet. Ask the developer to finish the M-Pesa settings.");
  }
  return { key, secret, shortcode, passkey, baseUrl: baseUrl.replace(/\/$/, ""), hook };
}

// M-Pesa can only charge whole shillings
export function whole(v: unknown): number {
  const n = Number(String(v));
  if (!Number.isInteger(n) || n < 1) {
    throw new HttpError(400, "M-Pesa can only charge whole shillings. Ask DO Finance to confirm this payment manually.");
  }
  return n;
}

export async function registrationFee(): Promise<number> {
  const s = await db.systemSetting.findUnique({ where: { key: "registrationFee" } });
  const n = Number(s?.value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

// Daraja timestamps are YYYYMMDDHHmmss in Nairobi time (UTC+3)
const stamp = () => new Date(Date.now() + 3 * 3_600_000).toISOString().replace(/[-:T]/g, "").slice(0, 14);

let cached: { value: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.value;
  const c = config();
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: "Basic " + Buffer.from(`${c.key}:${c.secret}`).toString("base64") },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    throw new HttpError(502, "M-Pesa rejected the app credentials. Check the consumer key and secret.");
  }
  cached = { value: String(j.access_token), exp: Date.now() + (Number(j.expires_in || 3599) - 60) * 1000 };
  return cached.value;
}

export async function stkPush(p: { phone: string; amount: number; reference: string; desc: string }) {
  const c = config();
  const ts = stamp();
  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: c.shortcode,
      Password: Buffer.from(c.shortcode + c.passkey + ts).toString("base64"),
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: p.amount,
      PartyA: p.phone,
      PartyB: c.shortcode,
      PhoneNumber: p.phone,
      CallBackURL: `${c.baseUrl}/api/mpesa/callback/${c.hook}`,
      AccountReference: p.reference.slice(0, 12),
      TransactionDesc: p.desc.slice(0, 13),
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || String(j.ResponseCode) !== "0") {
    throw new HttpError(502, String(j.errorMessage || j.ResponseDescription || "M-Pesa did not accept the request"));
  }
  return {
    checkoutRequestId: String(j.CheckoutRequestID),
    merchantRequestId: String(j.MerchantRequestID),
    message: String(j.CustomerMessage || "Check your phone and enter your M-Pesa PIN."),
  };
}

// Asks Daraja what happened. Returns null while the payment is still being processed.
export async function stkQuery(checkoutRequestId: string): Promise<{ resultCode: number; resultDesc: string } | null> {
  const c = config();
  const ts = stamp();
  const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: c.shortcode,
      Password: Buffer.from(c.shortcode + c.passkey + ts).toString("base64"),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (j.ResultCode === undefined || j.ResultCode === null) return null;
  return { resultCode: Number(j.ResultCode), resultDesc: String(j.ResultDesc ?? "") };
}

type Outcome = {
  resultCode: number;
  resultDesc: string;
  receipt?: string | null;
  amount?: number | null;
  raw?: Prisma.InputJsonValue;
};

// Applies a result from the callback or a status query. Safe to run twice: only the first result counts.
export async function settle(checkoutRequestId: string, o: Outcome): Promise<TransactionStatus | null> {
  const t = await db.transaction.findUnique({ where: { checkoutRequestId } });
  if (!t) return null;

  if (t.status !== "PENDING") {
    // A late callback can add the M-Pesa code to a payment already confirmed by a status check
    if (t.status === "SUCCESS" && o.resultCode === 0 && o.receipt && !t.mpesaReceipt) {
      await db.transaction
        .updateMany({
          where: { id: t.id, mpesaReceipt: null },
          data: { mpesaReceipt: o.receipt, ...(o.raw !== undefined ? { rawCallback: o.raw } : {}) },
        })
        .catch(() => undefined);
    }
    return t.status;
  }

  const success = o.resultCode === 0;

  // Never credit a payment whose amount differs from what we asked for
  if (success && o.amount != null && o.amount !== Number(String(t.amount))) {
    await db.transaction.updateMany({
      where: { id: t.id, status: "PENDING" },
      data: {
        status: "FAILED",
        resultCode: o.resultCode,
        resultDesc: `Amount mismatch: expected ${t.amount}, got ${o.amount}`,
        ...(o.raw !== undefined ? { rawCallback: o.raw } : {}),
      },
    });
    return "FAILED";
  }

  const status: TransactionStatus = success ? "SUCCESS" : o.resultCode === 1032 ? "CANCELLED" : "FAILED";
  let applied = false;
  try {
    applied = await db.$transaction(async (tx) => {
      const u = await tx.transaction.updateMany({
        where: { id: t.id, status: "PENDING" },
        data: {
          status,
          resultCode: o.resultCode,
          resultDesc: o.resultDesc.slice(0, 250),
          mpesaReceipt: success ? (o.receipt ?? null) : null,
          ...(o.raw !== undefined ? { rawCallback: o.raw } : {}),
        },
      });
      if (u.count === 0) return false;
      if (success && t.purpose === "STORE_ORDER" && t.orderId) {
        await tx.order.updateMany({ where: { id: t.orderId, status: "PENDING_PAYMENT" }, data: { status: "PAID" } });
      }
      return true;
    }, TX_OPTS);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && o.receipt) {
      return settle(checkoutRequestId, { ...o, receipt: null });
    }
    throw e;
  }

  if (applied && status === "SUCCESS") {
    try {
      after(() => notifyPaymentSuccess(t.id));
    } catch {
      void notifyPaymentSuccess(t.id);
    }
  }

  if (applied) {
    await db.auditLog.create({
      data: {
        actorId: null,
        action: `MPESA_PAYMENT_${status}`,
        entity: "Transaction",
        entityId: t.id,
        metadata: { purpose: t.purpose, amount: Number(String(t.amount)) },
      },
    });
  }
  return status;
}
