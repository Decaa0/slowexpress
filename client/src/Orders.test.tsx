import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { Orders, STAFF_REFRESH_MS } from "./App";

const order = (id: string) => ({ id, status: "PLACED", paymentStatus: "PENDING", totalCents: 5500, callName: null, shop: { name: "Slow Express" }, table: { label: "SE-1" }, createdAt: "", items: [] });
let calls = 0;
beforeEach(() => { calls = 0; vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn(async () => { calls++; return { ok: true, status: 200, json: async () => [order("o" + calls)] } as Response; })); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("F-06 staff list refresh (issue #1)", () => {
  it("reloads every 10 s for staff and the Refresh button reloads immediately", async () => {
    render(<Orders staff onOpen={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(calls).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(STAFF_REFRESH_MS); });
    expect(calls).toBe(2);
    await act(async () => { fireEvent.click(screen.getByText("Refresh")); });
    expect(calls).toBe(3);
  });
  it("stops polling after unmount, and customers do not poll", async () => {
    const { unmount } = render(<Orders staff onOpen={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(STAFF_REFRESH_MS * 3); });
    expect(calls).toBe(1);
    calls = 0; cleanup();
    render(<Orders staff={false} onOpen={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(STAFF_REFRESH_MS * 3); });
    expect(calls).toBe(1);
  });
});
