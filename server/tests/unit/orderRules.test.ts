import { describe, it, expect } from "vitest";
import { lineTotal, validateOrderBody } from "../../src/domain/orderRules";

const line = (over = {}) => ({ menuItemId: "m1", quantity: 1, toppingIds: [] as string[], ...over });

describe("order rules (unit)", () => {
  it("TEST-U01 / AC-11: lineTotal = (drink + toppings) x qty", () => {
    expect(lineTotal({ drinkPriceCents: 5500, toppingPricesCents: [1500, 1000], quantity: 2 })).toBe(16000);
  });
  it("TEST-U02 / AC-13,14,17: validateOrderBody boundaries", () => {
    expect(validateOrderBody({ items: [line({ quantity: 1 })] }).ok).toBe(true);
    expect(validateOrderBody({ items: [line({ quantity: 10 })] }).ok).toBe(true);
    expect(validateOrderBody({ items: [line({ quantity: 0 })] }).ok).toBe(false);
    expect(validateOrderBody({ items: [line({ quantity: 11 })] }).ok).toBe(false);
    expect(validateOrderBody({ items: [] }).ok).toBe(false);
    expect(validateOrderBody({ items: [line({ toppingIds: ["a", "b", "c"] })] }).ok).toBe(true);
    expect(validateOrderBody({ items: [line({ toppingIds: ["a", "b", "c", "d"] })] }).ok).toBe(false);
    expect(validateOrderBody({ items: [line({ toppingIds: ["a", "a"] })] }).ok).toBe(false);
    expect(validateOrderBody({ items: [line({ note: "x".repeat(100) })] }).ok).toBe(true);
    expect(validateOrderBody({ items: [line({ note: "x".repeat(101) })] }).ok).toBe(false);
  });
});
