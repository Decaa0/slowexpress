import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { config } from "../config";

export const tablesRouter = Router();
export const guestRouter = Router();
const GUEST_HOURS = 3;

async function activeTable(code: unknown) {
  const t = typeof code === "string" && code ? await prisma.diningTable.findUnique({ where: { code }, include: { shop: true } }) : null;
  if (!t || !t.active) throw new ApiError(404, "NOT_FOUND", "Table not found");
  return t;
}
export const publicTable = (t: { id: string; label: string; shop: { id: string; name: string } }) => ({ shop: { id: t.shop.id, name: t.shop.name }, table: { id: t.id, label: t.label } });

tablesRouter.get("/:code", async (req, res, next) => { try { res.json(publicTable(await activeTable(req.params.code))); } catch (e) { next(e); } });

guestRouter.post("/", async (req, res, next) => {
  try {
    const code = req.body?.tableCode;
    if (typeof code !== "string" || !code) throw new ApiError(400, "VALIDATION_ERROR", "tableCode is required");
    const t = await activeTable(code);
    const id = randomUUID();
    await prisma.guestSession.create({ data: { id, tableId: t.id, expiresAt: new Date(Date.now() + GUEST_HOURS * 3600_000) } });
    const token = jwt.sign({ sub: id, jti: id, typ: "guest" }, config.jwtSecret(), { expiresIn: `${GUEST_HOURS}h` });
    res.status(201).json({ token, ...publicTable(t) });
  } catch (e) { next(e); }
});
