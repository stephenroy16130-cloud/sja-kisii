import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { kes, orderTone, orderWord } from "@/lib/store";
import CreateItemForm from "./create-item-form";
import ItemControls from "./item-controls";
import OrderActions from "./order-actions";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

async function loadOrders() {
  return db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { fullName: true, phone: true, crewId: true } },
      items: { include: { item: { select: { name: true } } } },
    },
  });
}
type OrderRow = Awaited<ReturnType<typeof loadOrders>>[number];

function OrderCard({ o }: { o: OrderRow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide">{o.user.fullName}</p>
          <p className="mt-1 text-xs text-white/40">
            {o.user.phone} · {crewName(o.user.crewId)} · {fmt(o.createdAt)}
          </p>
          <div className="mt-3">
            {o.items.map((oi) => (
              <p key={oi.id} className="text-sm">
                {oi.quantity} × {oi.item.name}
                {oi.size ? ` · ${oi.size}` : ""}
                {oi.notes ? <span className="text-white/40"> · &ldquo;{oi.notes}&rdquo;</span> : null}
              </p>
            ))}
          </div>
          <p className="mt-2 text-gold">{kes(o.total)}</p>
        </div>
        <span className={`${chip} ${orderTone[o.status]}`}>{orderWord[o.status]}</span>
      </div>
      <div className="mt-4">
        <OrderActions orderId={o.id} status={o.status} />
      </div>
    </div>
  );
}

export default async function ManageStorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "finance:manage")) redirect("/dashboard/store");

  const [items, orders] = await Promise.all([
    db.item.findMany({ orderBy: { createdAt: "desc" } }),
    loadOrders(),
  ]);
  const awaiting = orders.filter((o) => o.status === "PENDING_PAYMENT");
  const toCollect = orders.filter((o) => o.status === "PAID");
  const done = orders.filter((o) => o.status === "FULFILLED" || o.status === "CANCELLED");

  return (
    <div className="space-y-10">
      <div>
        <Link href="/dashboard/store" className="text-sm text-white/50 hover:text-white">
          ← Store
        </Link>
        <h1 className="mt-3 text-3xl font-light tracking-tight">Manage store</h1>
        <p className="mt-1 text-sm text-white/50">Items, stock and payment confirmations.</p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-light">Awaiting payment ({awaiting.length})</h2>
        <p className="mb-4 text-sm text-white/50">
          When a member pays by M-Pesa, enter the confirmation code from the M-Pesa message to mark the order paid.
        </p>
        {awaiting.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">Nothing waiting.</div>
        ) : (
          <div className="space-y-3">
            {awaiting.map((o) => (
              <OrderCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-light">Paid, ready to hand over ({toCollect.length})</h2>
        {toCollect.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">Nothing to hand over.</div>
        ) : (
          <div className="space-y-3">
            {toCollect.map((o) => (
              <OrderCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-light">Add an item</h2>
        <CreateItemForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-light">Items ({items.length})</h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">No items yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((i) => {
              const ready = i.stockType === "READY_STOCK";
              return (
                <div key={i.id} className="rounded-2xl border border-white/10 bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-light">{i.name}</p>
                      <p className="mt-1 text-sm text-white/50">
                        {kes(i.price)} · {ready ? `${i.quantity} in stock` : "Made to order"}
                        {i.sizes.length > 0 ? ` · ${i.sizes.join(", ")}` : ""}
                      </p>
                      {!ready && (i.orderOpensAt || i.orderClosesAt) && (
                        <p className="mt-1 text-xs text-white/40">
                          {i.orderOpensAt ? `Opens ${fmt(i.orderOpensAt)}` : ""}
                          {i.orderOpensAt && i.orderClosesAt ? " · " : ""}
                          {i.orderClosesAt ? `Closes ${fmt(i.orderClosesAt)}` : ""}
                        </p>
                      )}
                    </div>
                    <span className={`${chip} ${i.isActive ? "border-ok/50 text-ok" : "border-white/20 text-white/40"}`}>
                      {i.isActive ? "Visible" : "Hidden"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <ItemControls id={i.id} isActive={i.isActive} ready={ready} quantity={i.quantity} imageUrl={i.imageUrl} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xl font-light text-white/60 hover:text-white">
            Collected and cancelled ({done.length})
          </summary>
          <div className="mt-4 space-y-3">
            {done.map((o) => (
              <OrderCard key={o.id} o={o} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
