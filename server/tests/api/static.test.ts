import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";

// Lab 5.3: the container serves the built web app from the API origin.
describe("serving the built web app", () => {
  it("serves index.html for app routes and keeps /api errors as JSON", async () => {
    const dir = mkdtempSync(join(tmpdir(), "slowexpress-dist-"));
    writeFileSync(join(dir, "index.html"), "<!doctype html><title>Slow Express</title>");
    process.env.CLIENT_DIST = dir;
    const { createApp } = await import("../../src/app");
    const app = createApp();
    delete process.env.CLIENT_DIST;

    const page = await request(app).get("/t/some-table-code");
    expect(page.status).toBe(200);
    expect(page.text).toContain("Slow Express");

    const api = await request(app).get("/api/does-not-exist");
    expect(api.status).toBe(404);
    expect(api.body.error.code).toBe("NOT_FOUND");
  });

  it("does not serve pages when there is no built client (development and tests)", async () => {
    process.env.CLIENT_DIST = mkdtempSync(join(tmpdir(), "slowexpress-empty-"));
    const { createApp } = await import("../../src/app");
    const app = createApp();
    delete process.env.CLIENT_DIST;
    const r = await request(app).get("/t/some-table-code");
    expect(r.status).toBe(404);
  });
});
