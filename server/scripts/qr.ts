import QRCode from "qrcode";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../src/db";
import { renderQrSheet } from "../src/domain/qrSheet";

const base = process.env.PUBLIC_URL || "http://localhost:5173";
mkdirSync("../docs/qr", { recursive: true });
const tables = await prisma.diningTable.findMany({ where: { active: true }, include: { shop: true }, orderBy: [{ shopId: "asc" }, { label: "asc" }] });
const cards = [];
for (const t of tables) {
  const url = `${base}/t/${t.code}`;
  await QRCode.toFile(`../docs/qr/${t.label}.png`, url, { width: 320, margin: 2 });
  cards.push({ shop: t.shop.name, label: t.label, url, qrDataUrl: await QRCode.toDataURL(url, { width: 320, margin: 2 }) });
  console.log(`${t.shop.name} ${t.label} -> ${url}`);
}
writeFileSync("../docs/qr/index.html", renderQrSheet(cards));
console.log(`wrote docs/qr/index.html (${cards.length} tables)`);
await prisma.$disconnect();
