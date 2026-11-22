import { seed } from "../src/seedData";
import { prisma } from "../src/db";

seed()
  .then(async () => {
    console.log("seeded");
    // Table codes are random per database, so print each table's link path. In the cloud this lands in the
    // migration job log, which is how the team finds the /t/<code> link to open on the live URL.
    const tables = await prisma.diningTable.findMany({ include: { shop: true }, orderBy: [{ shopId: "asc" }, { label: "asc" }] });
    for (const t of tables) console.log(`table ${t.label} (${t.shop.name}): /t/${t.code}`);
  })
  .finally(() => prisma.$disconnect());
