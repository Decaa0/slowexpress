import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();
const publicUser = (u: { id: string; email: string; fullName: string; role: string; shopId: string | null }) =>
  ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, shopId: u.shopId });

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) throw new ApiError(400, "VALIDATION_ERROR", "email and password are required");
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    const jti = randomUUID();
    await prisma.session.create({ data: { id: jti, userId: user.id, expiresAt: new Date(Date.now() + config.sessionHours * 3600_000) } });
    const token = jwt.sign({ sub: user.id, jti }, config.jwtSecret(), { expiresIn: `${config.sessionHours}h` });
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, (req, res, next) => {
  const p = req.principal!;
  if (p.kind === "guest") return next(new ApiError(403, "FORBIDDEN", "Guests have no account"));
  res.json(publicUser(p));
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const p = req.principal!;
    if (p.kind === "guest") await prisma.guestSession.update({ where: { id: req.sessionId! }, data: { revokedAt: new Date() } });
    else await prisma.session.update({ where: { id: req.sessionId! }, data: { revokedAt: new Date() } });
    res.status(204).end();
  } catch (e) { next(e); }
});
