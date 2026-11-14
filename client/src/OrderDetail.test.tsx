import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { OrderDetail, ORDER_REFRESH_MS } from "./App";

const order = (status: string) => ({ id: "o1", status, paymentStatus: "PENDING", totalCents: 5500, callName: "Mint", shop: { name: "Slow Express" }, table: { label: "SE-1" }, createdAt: "", items: [] });
let calls = 0; let status = "PLACED";
beforeEach(() => { calls = 0; status = "PLACED"; vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn(async () => { calls++; return { ok: true, status: 200, json: async () => order(status) } as Response; })); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe("F-05 customer order status refresh (issue #5)", () => {
  it("shows ACCEPTED within one refresh interval without a reload, then stops polling", async () => {
    render(<OrderDetail id="o1" onBack={() => {}} />);
    await tick(0);
    expect(screen.getByTestId("status").textContent).toBe("PLACED");
    status = "ACCEPTED";
    await tick(ORDER_REFRESH_MS);
    expect(screen.getByTestId("status").textContent).toBe("ACCEPTED");
    const after = calls;
    await tick(ORDER_REFRESH_MS * 3);
    expect(calls).toBe(after);
  });
  it("stops polling after unmount", async () => {
    const { unmount } = render(<OrderDetail id="o1" onBack={() => {}} />);
    await tick(0); unmount();
    const after = calls;
    await tick(ORDER_REFRESH_MS * 3);
    expect(calls).toBe(after);
  });
  it("shows the error and stops polling when the order is not found (404)", async () => {
    (fetch as any).mockImplementation(async () => { calls++; return { ok: false, status: 404, json: async () => ({ error: { code: "NOT_FOUND", message: "Order not found" } }) } as Response; });
    render(<OrderDetail id="o1" onBack={() => {}} />);
    await tick(0);
    expect(screen.getByRole("alert").textContent).toContain("Order not found");
    const after = calls;
    await tick(ORDER_REFRESH_MS * 3);
    expect(calls).toBe(after);
  });
});
