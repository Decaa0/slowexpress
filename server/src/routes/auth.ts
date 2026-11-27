import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();
const publicUser = (u: { id: string; email: string; fullName: string; role: string; shopId: string | null; shop?: { name: string } | null }) =>
  ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, shopId: u.shopId, shopName: u.shop?.name ?? null });

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) throw new ApiError(400, "VALIDATION_ERROR", "email and password are required");
    const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
    const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    const jti = randomUUID();
    await prisma.session.create({ data: { id: jti, userId: user.id, expiresAt: new Date(Date.now() + config.sessionHours * 3600_000) } });
    const token = jwt.sign({ sub: user.id, jti }, config.jwtSecret(), { expiresIn: `${config.sessionHours}h` });
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const p = req.principal!;
    if (p.kind === "guest") throw new ApiError(403, "FORBIDDEN", "Guests have no account");
    const u = await prisma.user.findUnique({ where: { id: p.id }, select: { id: true, email: true, fullName: true, role: true, shopId: true, points: true, shop: { select: { name: true } } } });
    if (!u) throw new ApiError(401, "UNAUTHENTICATED", "Account not found");
    const { shop, ...rest } = u;
    res.json({ ...rest, shopName: shop?.name ?? null, points: u.role === "MEMBER" ? u.points : undefined });
  } catch (e) { next(e); }
});

authRouter.get("/rewards", requireAuth, async (req, res, next) => {
  try {
    const p = req.principal!;
    if (p.kind !== "user" || p.role !== "MEMBER") throw new ApiError(403, "FORBIDDEN", "Member account required");
    const [user, orders] = await Promise.all([
      prisma.user.findUnique({ where: { id: p.id }, select: { points: true } }),
      prisma.order.findMany({ where: { memberId: p.id, OR: [{ pointsEarned: { gt: 0 } }, { pointsRedeemed: { gt: 0 } }] }, select: { id: true, createdAt: true, totalCents: true, discountCents: true, pointsEarned: true, pointsRedeemed: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Account not found");
    res.json({ points: user.points, redemptionRate: 100, history: orders });
  } catch (e) { next(e); }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const p = req.principal!;
    if (p.kind === "guest") await prisma.guestSession.update({ where: { id: req.sessionId! }, data: { revokedAt: new Date() } });
    else await prisma.session.update({ where: { id: req.sessionId! }, data: { revokedAt: new Date() } });
    res.status(204).end();
  } catch (e) { next(e); }
});
