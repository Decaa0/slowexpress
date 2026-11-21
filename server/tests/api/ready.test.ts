import { describe, it, expect, vi, afterEach } from "vitest";
import { api, prisma } from "../helpers";

describe("Lab 5.2: health and readiness", () => {
  afterEach(() => vi.restoreAllMocks());

  it("GET /api/health returns 200 without touching the database", async () => {
    const r = await api().get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ok");
  });

  it("GET /api/ready returns 200 when the database answers", async () => {
    const r = await api().get("/api/ready");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: "ready", db: "connected" });
  });

  it("GET /api/ready returns 503 when the database is unreachable", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));
    const r = await api().get("/api/ready");
    expect(r.status).toBe(503);
    expect(r.body.status).toBe("not_ready");
  });
});
