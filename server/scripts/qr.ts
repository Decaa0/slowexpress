import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { prisma } from "../src/db";
const base = process.env.PUBLIC_URL || "http://localhost:5173";
mkdirSync("../docs/qr", { recursive: true });
const tables = await prisma.diningTable.findMany({ include: { shop: true }, orderBy: { label: "asc" } });
for (const t of tables) {
  const url = `${base}/t/${t.code}`;
  await QRCode.toFile(`../docs/qr/${t.label}.png`, url, { width: 320, margin: 2 });
  console.log(`${t.shop.name} ${t.label} -> ${url}`);
}
await prisma.$disconnect();
