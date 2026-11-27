export type Topping = { id: string; name: string; priceCents: number; imageKey: string };
export type Drink = { id: string; name: string; priceCents: number; imageKey: string };
export type Menu = { shop: { id: string; name: string }; categories: { name: string; items: Drink[] }[]; toppings: Topping[] };
export type OrderLine = { menuItemId: string; itemName: string; unitPriceCents: number; quantity: number; note: string | null; toppings: { toppingId: string; toppingName: string; priceCents: number }[]; lineTotalCents: number };
export type Order = { id: string; status: string; paymentStatus: string; totalCents: number; subtotalCents?: number; discountCents?: number; pointsRedeemed?: number; pointsEarned?: number; callName: string | null; shop: { name: string }; table: { label: string }; createdAt: string; items: OrderLine[] };
export type User = { id: string; fullName: string; role: "MEMBER" | "OPERATOR"; shopId: string | null; shopName?: string | null; points?: number };
export type RewardHistory = { id: string; createdAt: string; totalCents: number; discountCents: number; pointsEarned: number; pointsRedeemed: number };
export type Rewards = { points: number; redemptionRate: number; history: RewardHistory[] };

type Session = { token: string; kind: "guest" | "user" } | null;
let session: Session = JSON.parse(sessionStorage.getItem("session") || "null");
export const getSession = () => session;
export const setSession = (s: Session) => { session = s; s ? sessionStorage.setItem("session", JSON.stringify(s)) : sessionStorage.removeItem("session"); };
export const baht = (c: number) => `฿${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? "ERROR", data?.error?.message ?? `Request failed (${res.status})`);
  return data as T;
}
