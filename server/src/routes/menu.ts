import { Router } from "express";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { requireAuth, requireCustomer } from "../middleware/auth";

export const menuRouter = Router();

/** Shop for the request: a guest's table, or ?tableCode= for members; operators see their own shop. */
export async function resolveShopAndTable(req: import("express").Request, tableCode?: string | null) {
  const p = req.principal!;
  if (p.kind === "guest") return { shopId: p.shopId, tableId: p.tableId };
  if (p.role === "OPERATOR") return { shopId: p.shopId!, tableId: null };
  const t = tableCode ? await prisma.diningTable.findUnique({ where: { code: tableCode } }) : null;
  if (!t || !t.active) throw new ApiError(404, "NOT_FOUND", "Table not found");
  return { shopId: t.shopId, tableId: t.id };
}

menuRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { shopId } = await resolveShopAndTable(req, typeof req.query.tableCode === "string" ? req.query.tableCode : null);
    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });
    const items = await prisma.menuItem.findMany({ where: { shopId, available: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
    const toppings = await prisma.topping.findMany({ where: { shopId, available: true }, orderBy: { name: "asc" } });
    const cats = new Map<string, unknown[]>();
    for (const i of items) { if (!cats.has(i.category)) cats.set(i.category, []); cats.get(i.category)!.push({ id: i.id, name: i.name, priceCents: i.priceCents, imageKey: i.imageKey }); }
    res.json({
      shop: { id: shop.id, name: shop.name },
      categories: [...cats].map(([name, items]) => ({ name, items })),
      toppings: toppings.map((t) => ({ id: t.id, name: t.name, priceCents: t.priceCents, imageKey: t.imageKey })),
    });
  } catch (e) { next(e); }
});
export { requireCustomer };
