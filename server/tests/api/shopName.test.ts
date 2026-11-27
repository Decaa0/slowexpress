import { describe, it, expect, beforeAll } from "vitest";
import { api, resetDb, login, auth } from "../helpers";

// Lab 6 DEF-SE-03: the staff page banner must show the operator's own shop, so the API has to tell the client the shop name.
describe("shop name for operators (DEF-SE-03)", () => {
  beforeAll(resetDb);

  it("login returns the operator's shop name", async () => {
    const slow = await api().post("/api/auth/login").send({ email: "slow@demo.test", password: (await import("../helpers")).demoPassword() });
    const cafe = await api().post("/api/auth/login").send({ email: "cafe@demo.test", password: (await import("../helpers")).demoPassword() });
    expect(slow.body.user.shopName).toBe("Slow Express");
    expect(cafe.body.user.shopName).toBe("Demo Cafe");
  });

  it("/auth/me returns the operator's shop name and never passwordHash", async () => {
    const res = await api().get("/api/auth/me").set(auth(await login("cafe@demo.test")));
    expect(res.status).toBe(200);
    expect(res.body.shopName).toBe("Demo Cafe");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("a member has no shop name", async () => {
    const res = await api().get("/api/auth/me").set(auth(await login("alice@demo.test")));
    expect(res.body.shopName ?? null).toBeNull();
  });
});
