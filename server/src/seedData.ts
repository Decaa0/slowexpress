import bcrypt from "bcryptjs";
import { prisma } from "./db";

/** Demo-account password comes from the environment, never from code (Lab 5.2 check 2). */
export function demoPassword(): string {
  const p = process.env.DEMO_PASSWORD;
  if (!p) throw new Error("DEMO_PASSWORD is not set (see server/.env.example)");
  return p;
}

/** Idempotent synthetic seed data (upserts / find-or-create only). */
export async function seed() {
  const hash = await bcrypt.hash(demoPassword(), 10);
  const slow = await prisma.shop.upsert({ where: { name: "Slow Express" }, update: {}, create: { name: "Slow Express" } });
  const cafe = await prisma.shop.upsert({ where: { name: "Demo Cafe" }, update: {}, create: { name: "Demo Cafe" } });

  const tables: [string, string][] = [[slow.id, "SE-1"], [slow.id, "SE-2"], [slow.id, "SE-3"], [cafe.id, "DC-1"], [cafe.id, "DC-2"]];
  for (const [shopId, label] of tables) {
    // Fixed, known codes for the demo tables (e.g. demo-se-1) so the menu link and its QR can be printed before the
    // first deploy. These are synthetic demo tables; the code is only a demo link, not a secret.
    const code = `demo-${label.toLowerCase()}`;
    const t = await prisma.diningTable.findFirst({ where: { shopId, label } });
    if (!t) await prisma.diningTable.create({ data: { shopId, label, code } });
    else if (t.code !== code) await prisma.diningTable.update({ where: { id: t.id }, data: { code } });
  }

  const users = [
    { email: "alice@demo.test", fullName: "Alice Member", role: "MEMBER", shopId: null },
    { email: "bob@demo.test", fullName: "Bob Member", role: "MEMBER", shopId: null },
    { email: "slow@demo.test", fullName: "Slow Express Staff", role: "OPERATOR", shopId: slow.id },
    { email: "cafe@demo.test", fullName: "Demo Cafe Staff", role: "OPERATOR", shopId: cafe.id },
  ];
  for (const u of users) await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash: hash } });

  const drinks = [
    { shopId: slow.id, name: "Thai Milk Tea", category: "Milk Tea", imageKey: "thai-milk-tea", priceCents: 4500, available: true },
    { shopId: slow.id, name: "Taiwan Milk Tea", category: "Milk Tea", imageKey: "taiwan-milk-tea", priceCents: 5000, available: true },
    { shopId: slow.id, name: "Matcha Latte", category: "Milk Tea", imageKey: "matcha-latte", priceCents: 6000, available: true },
    { shopId: slow.id, name: "Peach Oolong", category: "Fruit Tea", imageKey: "peach-oolong", priceCents: 5500, available: true },
    { shopId: slow.id, name: "Lychee Green Tea", category: "Fruit Tea", imageKey: "lychee-green", priceCents: 5500, available: true },
    { shopId: slow.id, name: "Americano", category: "Coffee", imageKey: "americano", priceCents: 4500, available: true },
    { shopId: slow.id, name: "Mango Sago", category: "Fruit Tea", imageKey: "mango-sago", priceCents: 6500, available: false },
    // Release B: more drinks per category. The loop below only creates a drink that does not exist yet, so the seed is safe to run twice.
    { shopId: slow.id, name: "Brown Sugar Milk Tea", category: "Milk Tea", imageKey: "brown-sugar-milk-tea", priceCents: 5500, available: true },
    { shopId: slow.id, name: "Taro Milk Tea", category: "Milk Tea", imageKey: "taro-milk-tea", priceCents: 5500, available: true },
    { shopId: slow.id, name: "Strawberry Green Tea", category: "Fruit Tea", imageKey: "strawberry-green", priceCents: 6000, available: true },
    { shopId: slow.id, name: "Passion Fruit Tea", category: "Fruit Tea", imageKey: "passion-fruit", priceCents: 5500, available: true },
    { shopId: slow.id, name: "Cappuccino", category: "Coffee", imageKey: "cappuccino", priceCents: 5500, available: true },
    { shopId: slow.id, name: "Iced Mocha", category: "Coffee", imageKey: "iced-mocha", priceCents: 6000, available: true },
    { shopId: cafe.id, name: "Cafe Latte", category: "Coffee", imageKey: "latte", priceCents: 6500, available: true },
  ];
  for (const d of drinks) if (!(await prisma.menuItem.findFirst({ where: { shopId: d.shopId, name: d.name } }))) await prisma.menuItem.create({ data: d });

  const toppings = [
    { shopId: slow.id, name: "Cream Cheese", imageKey: "cream-cheese", priceCents: 1500, available: true },
    { shopId: slow.id, name: "Boba Pearls", imageKey: "boba", priceCents: 1000, available: true },
    { shopId: slow.id, name: "Strawberry", imageKey: "strawberry", priceCents: 1500, available: true },
    { shopId: slow.id, name: "Lychee Jelly", imageKey: "lychee-jelly", priceCents: 1000, available: true },
    { shopId: slow.id, name: "Aloe", imageKey: "aloe", priceCents: 1000, available: false },
    { shopId: cafe.id, name: "Whipped Cream", imageKey: "whipped", priceCents: 1000, available: true },
  ];
  for (const t of toppings) if (!(await prisma.topping.findFirst({ where: { shopId: t.shopId, name: t.name } }))) await prisma.topping.create({ data: t });
}
