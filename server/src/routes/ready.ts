import { Router } from "express";
import { prisma } from "../db";

export const readyRouter = Router();

/** Liveness: the process is up. */
readyRouter.get("/health", (_req, res) => res.json({ status: "ok" }));

/** Readiness: 200 only when the database answers, otherwise 503 (used by the post-deploy smoke test). */
readyRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "connected" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});
