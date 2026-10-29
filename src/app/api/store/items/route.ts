import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(100),
    description: z.string().trim().max(500).optional(),
    stockType: z.enum(["READY_STOCK", "MADE_TO_ORDER"]),
    price: z.number().positive("Enter a price").max(1_000_000),
    quantity: z.number().int().min(0).max(100000).optional(),
    sizes: z.array(z.string().trim().min(1).max(20)).max(15).default([]),
    orderOpensAt: z.string().datetime().optional(),
    orderClosesAt: z.string().datetime().optional(),
  })
  .refine((d) => d.stockType !== "READY_STOCK" || d.quantity !== undefined, {
    message: "Enter how many are in stock",
    path: ["quantity"],
  })
  .refine((d) => !d.orderOpensAt || !d.orderClosesAt || new Date(d.orderClosesAt) > new Date(d.orderOpensAt), {
    message: "Closing must be after opening",
    path: ["orderClosesAt"],
  });

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("finance:manage");
  const d = schema.parse(await req.json());
  const ready = d.stockType === "READY_STOCK";

  const item = await db.item.create({
    data: {
      name: d.name,
      description: d.description || null,
      stockType: d.stockType,
      price: Math.round(d.price * 100) / 100,
      quantity: ready ? (d.quantity ?? 0) : null,
      sizes: ready ? [] : [...new Set(d.sizes)],
      orderOpensAt: !ready && d.orderOpensAt ? new Date(d.orderOpensAt) : null,
      orderClosesAt: !ready && d.orderClosesAt ? new Date(d.orderClosesAt) : null,
    },
    select: { id: true, name: true },
  });
  await audit(actor.id, "STORE_ITEM_CREATED", "Item", item.id, { name: item.name, stockType: d.stockType });
  return Response.json(item, { status: 201 });
});
