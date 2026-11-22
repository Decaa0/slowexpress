import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemberRewards } from "./App";
import { setSession } from "./api";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setSession(null); });

describe("member rewards panel", () => {
  it("shows points, the discount conversion, and recent earned/redeemed activity", async () => {
    setSession({ token: "test", kind: "user" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ points: 120, redemptionRate: 100, history: [{ id: "order-1", createdAt: "2026-11-21T12:00:00Z", totalCents: 4500, discountCents: 1000, pointsEarned: 3, pointsRedeemed: 100 }] }) } as Response)));
    render(<MemberRewards />);
    expect(await screen.findByText("120 points")).toBeTruthy();
    expect(screen.getByText("100 points = ฿10 off")).toBeTruthy();
    expect(screen.getByText(/Earned 3 points · used 100 points · saved ฿10/)).toBeTruthy();
  });
});
