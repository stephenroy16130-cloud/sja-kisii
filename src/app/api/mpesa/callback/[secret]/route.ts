import type { Prisma } from "@prisma/client";
import { timingSafeEqual } from "crypto";
import { settle } from "@/lib/mpesa";

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

type Item = { Name?: string; Value?: string | number };

export async function POST(req: Request, ctx: { params: Promise<{ secret: string }> }) {
  const { secret } = await ctx.params;
  const expected = process.env.MPESA_CALLBACK_SECRET;
  if (!expected || !same(secret, expected)) return new Response("Not found", { status: 404 });

  // Safaricom wants a quick "accepted" answer whatever we do with the data
  const ack = () => Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    const checkoutId = cb?.CheckoutRequestID;
    if (typeof checkoutId !== "string") return ack();

    const items: Item[] = Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [];
    const pick = (name: string) => items.find((i) => i.Name === name)?.Value;
    const amount = pick("Amount");
    const receipt = pick("MpesaReceiptNumber");

    await settle(checkoutId, {
      resultCode: Number(cb.ResultCode),
      resultDesc: String(cb.ResultDesc ?? ""),
      receipt: receipt != null ? String(receipt) : null,
      amount: amount != null ? Number(amount) : null,
      raw: body as Prisma.InputJsonValue,
    });
  } catch (e) {
    console.error("M-Pesa callback failed", e);
  }
  return ack();
}
