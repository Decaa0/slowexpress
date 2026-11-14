import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { config } from "../config";

export type Principal =
  | { kind: "user"; id: string; role: "MEMBER" | "OPERATOR"; email: string; fullName: string; shopId: string | null }
  | { kind: "guest"; id: string; tableId: string; shopId: string };

declare module "express-serve-static-core" { interface Request { principal?: Principal; sessionId?: string } }

const unauth = () => new ApiError(401, "UNAUTHENTICATED", "Authentication required");

/** Verifies the JWT, then re-loads the session (revocation/expiry) and the principal from the DB. Role and shop never come from the client. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauth();
    let payload: any;
    try { payload = jwt.verify(header.slice(7), config.jwtSecret()); } catch { throw unauth(); }
    const jti = String(payload.jti);
    if (payload.typ === "guest") {
      const gs = await prisma.guestSession.findUnique({ where: { id: jti }, include: { table: true } });
      if (!gs || gs.revokedAt || gs.expiresAt.getTime() < Date.now() || !gs.table.active) throw unauth();
      req.principal = { kind: "guest", id: gs.id, tableId: gs.tableId, shopId: gs.table.shopId };
    } else {
      const session = await prisma.session.findUnique({ where: { id: jti } });
      if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) throw unauth();
      const u = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!u || !u.active) throw unauth();
      req.principal = { kind: "user", id: u.id, role: u.role as "MEMBER" | "OPERATOR", email: u.email, fullName: u.fullName, shopId: u.shopId };
    }
    req.sessionId = jti;
    next();
  } catch (e) { next(e); }
}

const forbidden = () => new ApiError(403, "FORBIDDEN", "You are not allowed to do this");
export const requireOperator = (req: Request, _res: Response, next: NextFunction) =>
  req.principal?.kind === "user" && req.principal.role === "OPERATOR" ? next() : next(forbidden());
export const requireCustomer = (req: Request, _res: Response, next: NextFunction) =>
  req.principal?.kind === "guest" || (req.principal?.kind === "user" && req.principal.role === "MEMBER") ? next() : next(forbidden());
