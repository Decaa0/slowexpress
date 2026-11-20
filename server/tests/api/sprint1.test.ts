import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { api, auth, drink, guest, login, prisma, resetDb, tableCode, topping, demoPassword } from "../helpers";

beforeAll(resetDb);
beforeEach(resetDb);

const place = (token: string, body: unknown) => api().post("/api/orders").set(auth(token)).send(body as object);
const oneDrink = async (extra: object = {}) => ({ items: [{ menuItemId: await drink("Thai Milk Tea"), quantity: 1, toppingIds: [], ...extra }] });

describe("F-01 Authentication", () => {
  it("TEST-01 / AC-01: valid login returns token and public user only", async () => {
    const r = await api().post("/api/auth/login").send({ email: "alice@demo.test", password: demoPassword() });
    expect(r.status).toBe(200);
    expect(r.body.token).toBeTruthy();
    expect(r.body.user).toMatchObject({ email: "alice@demo.test", role: "MEMBER" });
    expect(JSON.stringify(r.body)).not.toContain("passwordHash");
  });
  it("TEST-02 / AC-02: wrong password and unknown email give the same 401; missing fields 400", async () => {
    const a = await api().post("/api/auth/login").send({ email: "alice@demo.test", password: "nope" });
    const b = await api().post("/api/auth/login").send({ email: "nobody@demo.test", password: "nope" });
    expect(a.status).toBe(401); expect(b.status).toBe(401);
    expect(a.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(a.body.error.message).toBe(b.body.error.message);
    expect((await api().post("/api/auth/login").send({ email: "alice@demo.test" })).status).toBe(400);
  });
  it("TEST-03 / AC-03: protected endpoints reject missing, malformed and badly signed tokens", async () => {
    for (const [m, p] of [["get", "/api/auth/me"], ["get", "/api/menu"], ["get", "/api/orders"], ["post", "/api/orders"], ["post", "/api/orders/x/accept"]] as const) {
      for (const h of [{}, { Authorization: "Bearer abc" }, { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.e30.bad" }]) {
        const r = await (api() as any)[m](p).set(h);
        expect(r.status, `${m} ${p}`).toBe(401);
        expect(r.body.error.code).toBe("UNAUTHENTICATED");
      }
    }
  });
  it("TEST-04 / AC-04: me returns user; logout revokes the token", async () => {
    const t = await login("alice@demo.test");
    expect((await api().get("/api/auth/me").set(auth(t))).body.email).toBe("alice@demo.test");
    expect((await api().post("/api/auth/logout").set(auth(t))).status).toBe(204);
    expect((await api().get("/api/auth/me").set(auth(t))).status).toBe(401);
  });
  it("TEST-05 / AC-05: passwords are stored as bcrypt hashes", async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "alice@demo.test" } });
    expect(u.passwordHash).not.toBe(demoPassword());
    expect(await bcrypt.compare(demoPassword(), u.passwordHash)).toBe(true);
  });
});

describe("F-02 Table QR and guest session", () => {
  it("TEST-06 / AC-06: table lookup returns shop and label; unknown or inactive is 404", async () => {
    const r = await api().get(`/api/tables/${await tableCode("SE-1")}`);
    expect(r.status).toBe(200);
    expect(r.body.shop.name).toBe("Slow Express");
    expect(r.body.table.label).toBe("SE-1");
    expect((await api().get("/api/tables/not-a-code")).status).toBe(404);
    await prisma.diningTable.update({ where: { shopId_label: { shopId: r.body.shop.id, label: "SE-3" } }, data: { active: false } });
    expect((await api().get(`/api/tables/${await tableCode("SE-3")}`)).status).toBe(404);
    await prisma.diningTable.updateMany({ where: { label: "SE-3" }, data: { active: true } });
  });
  it("TEST-07 / AC-07: guest session created for a valid table; 404 / 400 otherwise", async () => {
    const ok = await api().post("/api/guest-sessions").send({ tableCode: await tableCode("SE-2") });
    expect(ok.status).toBe(201);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.table.label).toBe("SE-2");
    expect((await api().post("/api/guest-sessions").send({ tableCode: "zzz" })).status).toBe(404);
    expect((await api().post("/api/guest-sessions").send({})).status).toBe(400);
  });
  it("TEST-08 / AC-08: guest cannot accept orders; dead guest token is 401", async () => {
    const g = await guest();
    const o = await place(g, await oneDrink());
    expect((await api().post(`/api/orders/${o.body.id}/accept`).set(auth(g))).status).toBe(403);
    await prisma.guestSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await api().get("/api/orders").set(auth(g))).status).toBe(401);
  });
});

describe("F-03 Menu", () => {
  it("TEST-09 / AC-09: menu shows only available items of the table's shop", async () => {
    const r = await api().get("/api/menu").set(auth(await guest("SE-1")));
    expect(r.status).toBe(200);
    expect(r.body.shop.name).toBe("Slow Express");
    const names = r.body.categories.flatMap((c: any) => c.items.map((i: any) => i.name));
    expect(names).toContain("Thai Milk Tea");
    expect(names).not.toContain("Mango Sago");
    expect(names).not.toContain("Cafe Latte");
    expect(r.body.categories.map((c: any) => c.name)).toEqual(expect.arrayContaining(["Milk Tea", "Fruit Tea", "Coffee"]));
    const tn = r.body.toppings.map((t: any) => t.name);
    expect(tn).toContain("Cream Cheese");
    expect(tn).not.toContain("Aloe");
    expect(tn).not.toContain("Whipped Cream");
  });
});

describe("F-04 Place order", () => {
  it("TEST-10 / AC-10: guest order is saved and retrievable", async () => {
    const g = await guest();
    const body = { items: [{ menuItemId: await drink("Peach Oolong"), quantity: 2, toppingIds: [await topping("Cream Cheese")], note: "less ice" }] };
    const r = await place(g, body);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: "PLACED", paymentStatus: "PENDING" });
    const got = await api().get(`/api/orders/${r.body.id}`).set(auth(g));
    expect(got.status).toBe(200);
    expect(got.body.items[0].toppings[0].toppingName).toBe("Cream Cheese");
    expect(got.body.items[0].note).toBe("less ice");
    expect(got.body.table.label).toBe("SE-1");
  });
  it("TEST-11 / AC-11: total is computed on the server and client prices are ignored", async () => {
    const r = await place(await guest(), {
      totalCents: 1, priceCents: 1,
      items: [{ menuItemId: await drink("Peach Oolong"), quantity: 2, priceCents: 1, lineTotalCents: 1, toppingIds: [await topping("Cream Cheese"), await topping("Boba Pearls")] }],
    });
    expect(r.status).toBe(201);
    expect(r.body.totalCents).toBe((5500 + 1500 + 1000) * 2);
  });
  it("TEST-12 / AC-12: names and prices are snapshotted", async () => {
    const g = await guest();
    const r = await place(g, { items: [{ menuItemId: await drink("Peach Oolong"), quantity: 1, toppingIds: [await topping("Cream Cheese")] }] });
    await prisma.menuItem.updateMany({ where: { name: "Peach Oolong" }, data: { priceCents: 9999, name: "Renamed" } });
    await prisma.topping.updateMany({ where: { name: "Cream Cheese" }, data: { priceCents: 9999 } });
    const got = await api().get(`/api/orders/${r.body.id}`).set(auth(g));
    expect(got.body.items[0].itemName).toBe("Peach Oolong");
    expect(got.body.items[0].unitPriceCents).toBe(5500);
    expect(got.body.items[0].toppings[0].priceCents).toBe(1500);
    expect(got.body.totalCents).toBe(7000);
    await prisma.menuItem.updateMany({ where: { name: "Renamed" }, data: { priceCents: 5500, name: "Peach Oolong" } });
    await prisma.topping.updateMany({ where: { name: "Cream Cheese" }, data: { priceCents: 1500 } });
  });
  it("TEST-13 / AC-13: quantity boundaries", async () => {
    const g = await guest();
    for (const q of [0, 11, 1.5, "2"]) expect((await place(g, await oneDrink({ quantity: q }))).status, `qty ${q}`).toBe(400);
    for (const q of [1, 10]) expect((await place(g, await oneDrink({ quantity: q }))).status, `qty ${q}`).toBe(201);
  });
  it("TEST-14 / AC-14: 0 lines, 11 lines and duplicate drink are rejected", async () => {
    const g = await guest();
    expect((await place(g, { items: [] })).status).toBe(400);
    const id = await drink("Thai Milk Tea");
    expect((await place(g, { items: Array(11).fill({ menuItemId: id, quantity: 1, toppingIds: [] }) })).status).toBe(400);
    expect((await place(g, { items: [{ menuItemId: id, quantity: 1, toppingIds: [] }, { menuItemId: id, quantity: 1, toppingIds: [] }] })).status).toBe(400);
  });
  it("TEST-15 / AC-15: unavailable drink or topping is rejected and nothing is stored", async () => {
    const g = await guest();
    const before = await prisma.order.count();
    const a = await place(g, { items: [{ menuItemId: await drink("Mango Sago"), quantity: 1, toppingIds: [] }] });
    const b = await place(g, await oneDrink({ toppingIds: [await topping("Aloe")] }));
    expect(a.status).toBe(400); expect(a.body.error.code).toBe("ITEM_UNAVAILABLE");
    expect(b.status).toBe(400); expect(b.body.error.code).toBe("ITEM_UNAVAILABLE");
    expect(await prisma.order.count()).toBe(before);
  });
  it("TEST-16 / AC-16: drink or topping from another shop is rejected", async () => {
    const g = await guest("SE-1");
    const a = await place(g, { items: [{ menuItemId: await drink("Cafe Latte"), quantity: 1, toppingIds: [] }] });
    const b = await place(g, await oneDrink({ toppingIds: [await topping("Whipped Cream")] }));
    expect(a.status).toBe(400); expect(a.body.error.code).toBe("WRONG_SHOP");
    expect(b.status).toBe(400); expect(b.body.error.code).toBe("WRONG_SHOP");
  });
  it("TEST-17 / AC-17: topping and note limits", async () => {
    const g = await guest();
    const t = [await topping("Cream Cheese"), await topping("Boba Pearls"), await topping("Strawberry"), await topping("Lychee Jelly")];
    expect((await place(g, await oneDrink({ toppingIds: t }))).status).toBe(400);
    expect((await place(g, await oneDrink({ toppingIds: [t[0], t[0]] }))).status).toBe(400);
    expect((await place(g, await oneDrink({ note: "x".repeat(101) }))).status).toBe(400);
    expect((await place(g, await oneDrink({ toppingIds: t.slice(0, 3), note: "x".repeat(100) }))).status).toBe(201);
  });
  it("TEST-18 / AC-18: invalid second line stores nothing", async () => {
    const g = await guest();
    const [o, i, p] = [await prisma.order.count(), await prisma.orderItem.count(), await prisma.orderItemTopping.count()];
    const r = await place(g, { items: [
      { menuItemId: await drink("Thai Milk Tea"), quantity: 1, toppingIds: [await topping("Cream Cheese")] },
      { menuItemId: await drink("Mango Sago"), quantity: 1, toppingIds: [] }] });
    expect(r.status).toBe(400);
    expect([await prisma.order.count(), await prisma.orderItem.count(), await prisma.orderItemTopping.count()]).toEqual([o, i, p]);
  });
  it("TEST-19 / AC-19: operator cannot place orders; anonymous is 401", async () => {
    expect((await place(await login("slow@demo.test"), await oneDrink())).status).toBe(403);
    expect((await api().post("/api/orders").send(await oneDrink())).status).toBe(401);
  });
  it("TEST-20 / AC-20: callName limits", async () => {
    const g = await guest();
    const ok = await place(g, { ...(await oneDrink()), callName: "A".repeat(20) });
    expect(ok.status).toBe(201); expect(ok.body.callName).toBe("A".repeat(20));
    expect((await place(g, { ...(await oneDrink()), callName: "A".repeat(21) })).status).toBe(400);
    expect((await place(g, await oneDrink())).status).toBe(201);
    expect((await place(g, { ...(await oneDrink()), callName: "" })).status).toBe(201);
  });
});

describe("F-05 My orders", () => {
  it("TEST-21 / AC-21: member orders are attached to the account and listed newest first", async () => {
    const m = await login("alice@demo.test"); const code = await tableCode("SE-1");
    const a = await place(m, { ...(await oneDrink()), tableCode: code });
    const b = await place(m, { ...(await oneDrink({ quantity: 2 })), tableCode: code });
    expect(a.status).toBe(201); expect(b.status).toBe(201);
    const list = await api().get("/api/orders").set(auth(m));
    expect(list.body.map((o: any) => o.id)).toEqual([b.body.id, a.body.id]);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: a.body.id } });
    expect(row.memberId).not.toBeNull(); expect(row.guestSessionId).toBeNull();
  });
  it("TEST-22 / AC-22: guest sees only own session orders", async () => {
    const g1 = await guest(); const g2 = await guest();
    const o1 = await place(g1, await oneDrink()); const o2 = await place(g2, await oneDrink());
    expect((await api().get("/api/orders").set(auth(g1))).body.map((o: any) => o.id)).toEqual([o1.body.id]);
    expect((await api().get("/api/orders").set(auth(g2))).body.map((o: any) => o.id)).toEqual([o2.body.id]);
  });
  it("TEST-23 / AC-23: another customer's order is 404 with no data", async () => {
    const g1 = await guest(); const g2 = await guest();
    const o1 = await place(g1, await oneDrink());
    const r = await api().get(`/api/orders/${o1.body.id}`).set(auth(g2));
    expect(r.status).toBe(404); expect(r.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(r.body)).not.toContain("Thai Milk Tea");
    const m = await login("bob@demo.test");
    expect((await api().get(`/api/orders/${o1.body.id}`).set(auth(m))).status).toBe(404);
  });
});

describe("F-06 Operator orders and accept", () => {
  it("TEST-24 / AC-24: operator lists only own shop's orders with details", async () => {
    const a = await place(await guest("SE-1"), { ...(await oneDrink({ toppingIds: [await topping("Cream Cheese")] })), callName: "Mint" });
    await place(await guest("DC-1"), { items: [{ menuItemId: await drink("Cafe Latte"), quantity: 1, toppingIds: [] }] });
    const r = await api().get("/api/orders").set(auth(await login("slow@demo.test")));
    expect(r.status).toBe(200);
    expect(r.body.map((o: any) => o.id)).toEqual([a.body.id]);
    expect(r.body[0]).toMatchObject({ callName: "Mint" });
    expect(r.body[0].table.label).toBe("SE-1");
    expect(r.body[0].items[0].toppings[0].toppingName).toBe("Cream Cheese");
  });
  it("TEST-25 / AC-25: operator accepts a PLACED order", async () => {
    const o = await place(await guest(), await oneDrink());
    const r = await api().post(`/api/orders/${o.body.id}/accept`).set(auth(await login("slow@demo.test")));
    expect(r.status).toBe(200); expect(r.body.status).toBe("ACCEPTED");
    const row = await prisma.order.findUniqueOrThrow({ where: { id: o.body.id } });
    expect(row.status).toBe("ACCEPTED"); expect(row.acceptedAt).not.toBeNull(); expect(row.acceptedById).not.toBeNull();
  });
  it("TEST-26 / AC-26: accepting twice is 409 and changes nothing", async () => {
    const o = await place(await guest(), await oneDrink()); const op = await login("slow@demo.test");
    await api().post(`/api/orders/${o.body.id}/accept`).set(auth(op));
    const again = await api().post(`/api/orders/${o.body.id}/accept`).set(auth(op));
    expect(again.status).toBe(409); expect(again.body.error.code).toBe("INVALID_TRANSITION");
  });
  it("TEST-27 / AC-27: guest and member cannot accept", async () => {
    const g = await guest(); const o = await place(g, await oneDrink());
    expect((await api().post(`/api/orders/${o.body.id}/accept`).set(auth(g))).status).toBe(403);
    expect((await api().post(`/api/orders/${o.body.id}/accept`).set(auth(await login("alice@demo.test")))).status).toBe(403);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.body.id } })).status).toBe("PLACED");
  });
  it("TEST-28 / AC-28: operator of another shop gets 404", async () => {
    const o = await place(await guest(), await oneDrink()); const other = await login("cafe@demo.test");
    expect((await api().get(`/api/orders/${o.body.id}`).set(auth(other))).status).toBe(404);
    expect((await api().post(`/api/orders/${o.body.id}/accept`).set(auth(other))).status).toBe(404);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.body.id } })).status).toBe("PLACED");
  });
});
