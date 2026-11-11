import { db } from "./db";
import { notifyFinancePayment } from "./finance-alerts";
import { notifyUsers } from "./push";

const kes = (n: unknown) => "KES " + Number(String(n)).toLocaleString("en-KE");

// Tells the payer their payment arrived, then alerts DO Finance
export async function notifyPaymentSuccess(txId: string): Promise<void> {
  try {
    const t = await db.transaction.findUnique({
      where: { id: txId },
      select: { userId: true, amount: true, purpose: true },
    });
    if (t) {
      await notifyUsers([t.userId], {
        title: "Payment received",
        body: `${kes(t.amount)} received. Thank you.`,
        url: t.purpose === "STORE_ORDER" ? "/dashboard/store" : t.purpose === "COLLECTION" ? "/dashboard/pay" : "/dashboard",
        tag: "paid-" + txId,
      });
    }
  } catch (e) {
    console.error("payer notification failed", e);
  }
  await notifyFinancePayment(txId);
}
