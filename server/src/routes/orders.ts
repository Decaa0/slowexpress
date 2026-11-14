import { Router } from "express";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { requireAuth, requireCustomer, requireOperator, type Principal } from "../middleware/auth";
import { orderInclude, placeOrder, present } from "../services/orderService";
import { resolveShopAndTable } from "./menu";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
const notFound = () => new ApiError(404, "NOT_FOUND", "Order not found");

/** BR-07 / BR-08: who may see which orders. */
const scope = (p: Principal) =>
  p.kind === "guest" ? { guestSessionId: p.id } : p.role === "MEMBER" ? { memberId: p.id } : { shopId: p.shopId! };

ordersRouter.post("/", requireCustomer, async (req, res, next) => {
  try {
    const p = req.principal!;
    const { shopId, tableId } = await resolveShopAndTable(req, typeof req.body?.tableCode === "string" ? req.body.tableCode : null);
    res.status(201).json(await placeOrder(p, req.body, shopId, tableId!));
  } catch (e) { next(e); }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.order.findMany({ where: scope(req.principal!), include: orderInclude, orderBy: { createdAt: "desc" } });
    res.json(rows.map(present));
  } catch (e) { next(e); }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const o = await prisma.order.findFirst({ where: { id: req.params.id, ...scope(req.principal!) }, include: orderInclude });
    if (!o) throw notFound();
    res.json(present(o));
  } catch (e) { next(e); }
});

ordersRouter.post("/:id/accept", requireOperator, async (req, res, next) => {
  try {
    const p = req.principal!;
    if (p.kind !== "user") throw notFound();
    const o = await prisma.order.findFirst({ where: { id: req.params.id, shopId: p.shopId! } });
    if (!o) throw notFound();
    // conditional update so two simultaneous accepts cannot both succeed (BR-09)
    const r = await prisma.order.updateMany({ where: { id: o.id, status: "PLACED" }, data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: p.id } });
    if (r.count === 0) throw new ApiError(409, "INVALID_TRANSITION", `Order is ${o.status}, only PLACED orders can be accepted`);
    res.json(present(await prisma.order.findFirstOrThrow({ where: { id: o.id }, include: orderInclude })));
  } catch (e) { next(e); }
});
