import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { seed, DEMO_PASSWORD } from "../src/seedData";

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  await prisma.orderItemTopping.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.session.deleteMany();
  await prisma.guestSession.deleteMany();
  await seed();
  // restore any prices/availability changed by a test
  await prisma.menuItem.updateMany({ where: { name: { not: "Mango Sago" } }, data: { available: true } });
}

export const login = async (email: string) =>
  (await api().post("/api/auth/login").send({ email, password: DEMO_PASSWORD })).body.token as string;
export const tableCode = async (label: string) => (await prisma.diningTable.findFirstOrThrow({ where: { label } })).code;
export const guest = async (label = "SE-1") =>
  (await api().post("/api/guest-sessions").send({ tableCode: await tableCode(label) })).body.token as string;
export const drink = async (name: string) => (await prisma.menuItem.findFirstOrThrow({ where: { name } })).id;
export const topping = async (name: string) => (await prisma.topping.findFirstOrThrow({ where: { name } })).id;
export const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
export { prisma, DEMO_PASSWORD };
