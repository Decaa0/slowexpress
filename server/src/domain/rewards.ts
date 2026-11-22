export const POINTS_PER_BAHT10 = 1;
export const SATANG_PER_POINT = 10;

export function calculateRewards(subtotalCents: number, currentPoints: number, redeem: boolean) {
  const pointsAvailable = Math.max(0, Math.floor(currentPoints));
  const pointsRedeemed = redeem ? Math.min(pointsAvailable, Math.floor(subtotalCents / SATANG_PER_POINT)) : 0;
  const discountCents = pointsRedeemed * SATANG_PER_POINT;
  const netCents = Math.max(0, subtotalCents - discountCents);
  const pointsEarned = Math.floor(netCents / 1000) * POINTS_PER_BAHT10;
  return { discountCents, pointsRedeemed, pointsEarned, balanceAfter: pointsAvailable - pointsRedeemed + pointsEarned };
}
