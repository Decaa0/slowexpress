import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { ApiError } from "./errors";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
  app.use(express.json());
  // RED PHASE STUB: behaviour not implemented yet
  app.use("/api", (_req, _res, next) => next(new ApiError(501, "NOT_IMPLEMENTED", "Not implemented")));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  });
  return app;
}
