import { seed } from "../src/seedData";
import { prisma } from "../src/db";
seed().then(() => { console.log("seeded"); return prisma.$disconnect(); });
