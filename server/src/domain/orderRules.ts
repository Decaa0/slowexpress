export type LineInput = { drinkPriceCents: number; toppingPricesCents: number[]; quantity: number };

/** BR-15: (drink + toppings) x quantity, all in integer satang. */
export function lineTotal(l: LineInput): number {
  return (l.drinkPriceCents + l.toppingPricesCents.reduce((s, p) => s + p, 0)) * l.quantity;
}

export const LIMITS = { maxLines: 10, maxQty: 10, maxToppings: 3, maxNote: 100, maxCallName: 20 } as const;

export type ParsedLine = { menuItemId: string; quantity: number; toppingIds: string[]; note: string | null };
export type ParsedOrder = { callName: string | null; tableCode: string | null; items: ParsedLine[] };

/** BR-02, BR-03, BR-14, BR-16, BR-17: pure shape and boundary validation (no DB). */
export function validateOrderBody(b: unknown): { ok: boolean; error?: string; value?: ParsedOrder } {
  const fail = (error: string) => ({ ok: false, error });
  if (!b || typeof b !== "object") return fail("Body must be an object");
  const body = b as Record<string, any>;
  if (!Array.isArray(body.items)) return fail("items must be an array");
  if (body.items.length < 1 || body.items.length > LIMITS.maxLines) return fail(`An order needs 1..${LIMITS.maxLines} lines`);
  let callName: string | null = null;
  if (body.callName !== undefined && body.callName !== null) {
    if (typeof body.callName !== "string" || body.callName.length > LIMITS.maxCallName) return fail(`callName must be at most ${LIMITS.maxCallName} characters`);
    callName = body.callName.trim() || null;
  }
  const seen = new Set<string>();
  const items: ParsedLine[] = [];
  for (const l of body.items) {
    if (!l || typeof l !== "object" || typeof l.menuItemId !== "string" || !l.menuItemId) return fail("Each line needs a menuItemId");
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > LIMITS.maxQty) return fail(`quantity must be an integer 1..${LIMITS.maxQty}`);
    if (seen.has(l.menuItemId)) return fail("The same drink cannot appear twice");
    seen.add(l.menuItemId);
    const toppingIds = l.toppingIds ?? [];
    if (!Array.isArray(toppingIds) || toppingIds.some((t: unknown) => typeof t !== "string")) return fail("toppingIds must be an array of ids");
    if (toppingIds.length > LIMITS.maxToppings) return fail(`At most ${LIMITS.maxToppings} toppings per drink`);
    if (new Set(toppingIds).size !== toppingIds.length) return fail("A topping cannot be repeated on one drink");
    if (l.note !== undefined && l.note !== null && (typeof l.note !== "string" || l.note.length > LIMITS.maxNote)) return fail(`note must be at most ${LIMITS.maxNote} characters`);
    items.push({ menuItemId: l.menuItemId, quantity: l.quantity, toppingIds, note: l.note ? String(l.note) : null });
  }
  return { ok: true, value: { callName, tableCode: typeof body.tableCode === "string" ? body.tableCode : null, items } };
}
