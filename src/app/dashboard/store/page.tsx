import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { kes, orderTone, orderWord, windowState } from "@/lib/store";
import CancelOrderButton from "./cancel-order-button";
import OrderForm from "./order-form";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

export default async function StorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [items, orders] = await Promise.all([
    db.item.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { items: { include: { item: { select: { name: true } } } } },
    }),
  ]);
  const canManage = can(user, "finance:manage");

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Store</h1>
          <p className="mt-1 text-sm text-white/50">Division wear and supplies.</p>
        </div>
        {canManage && (
          <Link
            href="/dashboard/store/manage"
            className="rounded-full border border-gold/60 px-5 py-2.5 text-xs uppercase tracking-[0.15em] text-gold transition hover:bg-gold hover:text-black"
          >
            Manage store
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-xl font-light">Available</h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            Nothing in the store yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const mto = item.stockType === "MADE_TO_ORDER";
              const w = mto ? windowState(item.orderOpensAt, item.orderClosesAt) : "OPEN";
              const soldOut = !mto && (item.quantity ?? 0) <= 0;
              const orderable = !soldOut && w === "OPEN";
              const note = mto
                ? w === "NOT_YET"
                  ? `Opens ${fmt(item.orderOpensAt as Date)}`
                  : w === "CLOSED"
                    ? "Orders closed"
                    : item.orderClosesAt
                      ? `Orders close ${fmt(item.orderClosesAt)}`
                      : "Orders open"
                : soldOut
                  ? "Sold out"
                  : `${item.quantity} in stock`;
              return (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-light">{item.name}</p>
                    <p className="whitespace-nowrap text-gold">{kes(item.price)}</p>
                  </div>
                  {item.description && <p className="font-copy mt-2 text-sm text-white/60">{item.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`${chip} border-white/20 text-white/70`}>
                      {mto ? "Made to order" : "Ready stock"}
                    </span>
                    <span className={`${chip} ${orderable ? "border-ok/50 text-ok" : "border-white/20 text-white/40"}`}>
                      {note}
                    </span>
                  </div>
                  {orderable && (
                    <OrderForm
                      itemId={item.id}
                      price={Number(item.price)}
                      sizes={item.sizes}
                      madeToOrder={mto}
                      maxQty={mto ? null : item.quantity}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-light">My orders</h2>
        <p className="mb-4 text-sm text-white/50">
          After you order, pay by M-Pesa. DO Finance marks the order paid once the payment is confirmed.
        </p>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {o.items.map((oi) => (
                      <p key={oi.id} className="font-light">
                        {oi.quantity} × {oi.item.name}
                        {oi.size ? ` · ${oi.size}` : ""}
                      </p>
                    ))}
                    {o.items[0]?.notes && <p className="mt-1 text-xs text-white/40">&ldquo;{o.items[0].notes}&rdquo;</p>}
                    <p className="mt-2 text-sm text-white/50">
                      {fmt(o.createdAt)} · <span className="text-white/80">{kes(o.total)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`${chip} ${orderTone[o.status]}`}>{orderWord[o.status]}</span>
                    {o.status === "PENDING_PAYMENT" && <CancelOrderButton orderId={o.id} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
