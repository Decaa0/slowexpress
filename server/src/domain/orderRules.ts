export type LineInput = { drinkPriceCents: number; toppingPricesCents: number[]; quantity: number };
export function lineTotal(_l: LineInput): number { throw new Error("not implemented"); }
export function validateOrderBody(_b: unknown): { ok: boolean; error?: string } { throw new Error("not implemented"); }
