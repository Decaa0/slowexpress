import { describe, expect, it } from "vitest";
import { calculateRewards } from "../../src/domain/rewards";

describe("member rewards rules", () => {
  it("converts 100 points into ฿10 discount and earns points on paid-after-discount spend", () => {
    expect(calculateRewards(10_000, 250, true)).toEqual({ discountCents: 2_500, pointsRedeemed: 250, pointsEarned: 7, balanceAfter: 7 });
  });
  it("caps redemption at the order total and does not make a negative total", () => {
    expect(calculateRewards(700, 500, true)).toEqual({ discountCents: 700, pointsRedeemed: 70, pointsEarned: 0, balanceAfter: 430 });
  });
  it("does not redeem when the member opts out, but earns one point per ฿10 spent", () => {
    expect(calculateRewards(3_500, 80, false)).toEqual({ discountCents: 0, pointsRedeemed: 0, pointsEarned: 3, balanceAfter: 83 });
  });
});
