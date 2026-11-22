import { prisma } from "../db";
import { ApiError } from "../errors";
import { lineTotal, validateOrderBody } from "../domain/orderRules";
import { calculateRewards } from "../domain/rewards";
import type { Principal } from "../middleware/auth";

export const orderInclude = {
  shop: true, table: true,
  items: { include: { toppings: true }, orderBy: { id: "asc" as const } },
} as const;

type OrderRow = Awaited<ReturnType<typeof prisma.order.findFirstOrThrow<{ include: typeof orderInclude }>>>;
export function present(o: OrderRow) {
  return {
    id: o.id, status: o.status, paymentStatus: o.paymentStatus, totalCents: o.totalCents, subtotalCents: o.subtotalCents,
    discountCents: o.discountCents, pointsRedeemed: o.pointsRedeemed, pointsEarned: o.pointsEarned, callName: o.callName,
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
  const { items, callName, redeemPoints } = v.value;
  if (redeemPoints && (p.kind !== "user" || p.role !== "MEMBER")) throw new ApiError(403, "FORBIDDEN", "Only signed-in members can redeem points");
  const drinks = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });
  const toppingIds = [...new Set(items.flatMap((i) => i.toppingIds))];
  const toppings = await prisma.topping.findMany({ where: { id: { in: toppingIds } } });
  const dById = new Map(drinks.map((d) => [d.id, d])); const tById = new Map(toppings.map((t) => [t.id, t]));
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
  const subtotalCents = lines.reduce((s, x) => s + x.total, 0);
  const created = await prisma.$transaction(async (tx) => {
    const member = p.kind === "user" && p.role === "MEMBER" ? await tx.user.findUnique({ where: { id: p.id }, select: { points: true } }) : null;
    if (p.kind === "user" && p.role === "MEMBER" && !member) throw new ApiError(401, "UNAUTHENTICATED", "Member account not found");
    const rewards = member ? calculateRewards(subtotalCents, member.points, redeemPoints) : { discountCents: 0, pointsRedeemed: 0, pointsEarned: 0 };
    if (rewards.pointsRedeemed) {
      const debited = await tx.user.updateMany({ where: { id: p.id, points: { gte: rewards.pointsRedeemed } }, data: { points: { decrement: rewards.pointsRedeemed } } });
      if (debited.count !== 1) throw new ApiError(409, "POINTS_CHANGED", "Your points changed. Refresh and try again.");
    }
    const order = await tx.order.create({
      data: {
        shopId, tableId, callName, subtotalCents, discountCents: rewards.discountCents, pointsRedeemed: rewards.pointsRedeemed,
        pointsEarned: rewards.pointsEarned, totalCents: subtotalCents - rewards.discountCents,
        memberId: p.kind === "user" ? p.id : null,
        guestSessionId: p.kind === "guest" ? p.id : null,
        items: { create: lines.map(({ l, d, ts, total }) => ({
          menuItemId: d.id, itemName: d.name, unitPriceCents: d.priceCents, quantity: l.quantity,
          note: l.note, lineTotalCents: total,
          toppings: { create: ts.map((t) => ({ toppingId: t.id, toppingName: t.name, priceCents: t.priceCents })) },
        })) },
      }, include: orderInclude,
    });
    if (rewards.pointsEarned) await tx.user.update({ where: { id: p.id }, data: { points: { increment: rewards.pointsEarned } } });
    return order;
  });
  return present(created);
}
