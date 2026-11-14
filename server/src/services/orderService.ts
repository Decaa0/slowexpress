import { prisma } from "../db";
import { ApiError } from "../errors";
import { lineTotal, validateOrderBody } from "../domain/orderRules";
import type { Principal } from "../middleware/auth";

export const orderInclude = {
  shop: true, table: true,
  items: { include: { toppings: true }, orderBy: { id: "asc" as const } },
} as const;

type OrderRow = Awaited<ReturnType<typeof prisma.order.findFirstOrThrow<{ include: typeof orderInclude }>>>;
export function present(o: OrderRow) {
  return {
    id: o.id, status: o.status, paymentStatus: o.paymentStatus, totalCents: o.totalCents, callName: o.callName,
    createdAt: o.createdAt, acceptedAt: o.acceptedAt,
    shop: { id: o.shop.id, name: o.shop.name }, table: { id: o.table.id, label: o.table.label },
    items: o.items.map((i) => ({
      menuItemId: i.menuItemId, itemName: i.itemName, unitPriceCents: i.unitPriceCents, quantity: i.quantity, note: i.note,
      toppings: i.toppings.map((t) => ({ toppingId: t.toppingId, toppingName: t.toppingName, priceCents: t.priceCents })),
      lineTotalCents: i.lineTotalCents,
    })),
  };
}

export async function placeOrder(p: Principal, body: unknown, shopId: string, tableId: string) {
  const v = validateOrderBody(body);
  if (!v.ok || !v.value) throw new ApiError(400, "VALIDATION_ERROR", v.error ?? "Invalid order");
  const { items, callName } = v.value;

  const drinks = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });
  const toppingIds = [...new Set(items.flatMap((i) => i.toppingIds))];
  const toppings = await prisma.topping.findMany({ where: { id: { in: toppingIds } } });
  const dById = new Map(drinks.map((d) => [d.id, d])); const tById = new Map(toppings.map((t) => [t.id, t]));

  // existence + shop scope first (BR-05, BR-14), then availability (BR-04)
  for (const l of items) {
    const d = dById.get(l.menuItemId);
    if (!d) throw new ApiError(400, "VALIDATION_ERROR", "Unknown drink");
    if (d.shopId !== shopId) throw new ApiError(400, "WRONG_SHOP", "Drink does not belong to this shop");
    for (const id of l.toppingIds) {
      const t = tById.get(id);
      if (!t) throw new ApiError(400, "VALIDATION_ERROR", "Unknown topping");
      if (t.shopId !== shopId) throw new ApiError(400, "WRONG_SHOP", "Topping does not belong to this shop");
    }
  }
  for (const l of items) {
    if (!dById.get(l.menuItemId)!.available) throw new ApiError(400, "ITEM_UNAVAILABLE", `${dById.get(l.menuItemId)!.name} is not available`);
    for (const id of l.toppingIds) if (!tById.get(id)!.available) throw new ApiError(400, "ITEM_UNAVAILABLE", `${tById.get(id)!.name} is not available`);
  }

  const lines = items.map((l) => {
    const d = dById.get(l.menuItemId)!; const ts = l.toppingIds.map((id) => tById.get(id)!);
    return { l, d, ts, total: lineTotal({ drinkPriceCents: d.priceCents, toppingPricesCents: ts.map((t) => t.priceCents), quantity: l.quantity }) };
  });
  const totalCents = lines.reduce((s, x) => s + x.total, 0);

  // NFR-03: header, lines and topping lines in one transaction
  const created = await prisma.order.create({
    data: {
      shopId, tableId, callName, totalCents,
      memberId: p.kind === "user" ? p.id : null,
      guestSessionId: p.kind === "guest" ? p.id : null,
      items: { create: lines.map(({ l, d, ts, total }) => ({
        menuItemId: d.id, itemName: d.name, unitPriceCents: d.priceCents, quantity: l.quantity, note: l.note, lineTotalCents: total,
        toppings: { create: ts.map((t) => ({ toppingId: t.id, toppingName: t.name, priceCents: t.priceCents })) },
      })) },
    },
    include: orderInclude,
  });
  return present(created);
}
