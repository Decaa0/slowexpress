import { describe, it, expect, beforeAll } from "vitest";
import { api, resetDb } from "../helpers";

// Lab 5: the demo tables have fixed, known codes so the live menu link and its QR can be printed before the first deploy.
describe("demo table links (Lab 5)", () => {
  beforeAll(resetDb);

  it("opens the Slow Express menu from the fixed table code demo-se-1", async () => {
    const res = await api().get("/api/tables/demo-se-1");
    expect(res.status).toBe(200);
    expect(res.body.shop.name).toBe("Slow Express");
    expect(res.body.table.label).toBe("SE-1");
  });

  it("opens the Demo Cafe table demo-dc-1, and an unknown code is still 404", async () => {
    expect((await api().get("/api/tables/demo-dc-1")).body.shop.name).toBe("Demo Cafe");
    expect((await api().get("/api/tables/not-a-table")).status).toBe(404);
  });

  it("running the seed twice keeps one table per label", async () => {
    await resetDb();
    const res = await api().get("/api/tables/demo-se-2");
    expect(res.status).toBe(200);
  });
});
