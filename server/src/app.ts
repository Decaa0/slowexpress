import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import { ApiError } from "./errors";
import { authRouter } from "./routes/auth";
import { guestRouter, tablesRouter } from "./routes/tables";
import { menuRouter } from "./routes/menu";
import { ordersRouter } from "./routes/orders";
import { readyRouter } from "./routes/ready";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
  app.use(express.json());
  app.use("/api", readyRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/tables", tablesRouter);
  app.use("/api/guest-sessions", guestRouter);
  app.use("/api/menu", menuRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api", (_req, _res, next) => next(new ApiError(404, "NOT_FOUND", "Route not found")));
  // Container/production: serve the built web app from the same origin (the client calls /api).
  const clientDist = path.resolve(process.env.CLIENT_DIST || "../client/dist");
  if (existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }
  app.use((_req, _res, next) => next(new ApiError(404, "NOT_FOUND", "Route not found")));
  // NFR-04: uniform error shape, no stack traces
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if ((err as any)?.type === "entity.parse.failed") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  });
  return app;
}
