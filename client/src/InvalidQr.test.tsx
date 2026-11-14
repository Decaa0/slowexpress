import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import App from "./App";

const calls: string[] = [];
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
beforeEach(() => { calls.length = 0; sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.pushState({}, "", "/"); });

describe("F-02 invalid QR screen (issue #6)", () => {
  it("TEST-31 / AC-06: a 404 table shows the friendly message, no menu and no guest session", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { calls.push(url); return json(404, { error: { code: "NOT_FOUND", message: "Table not found" } }); }));
    window.history.pushState({}, "", "/t/not-a-code");
    render(<App />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("This QR code is not valid"));
    expect(screen.queryByText(/menu/i)).toBeNull();
    expect(calls.some((u) => u.includes("/guest-sessions"))).toBe(false);
    expect(sessionStorage.getItem("session")).toBeNull();
  });
  it("a valid code still starts a guest session and shows the menu", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("/tables/")) return json(200, { shop: { id: "s", name: "Slow Express" }, table: { id: "t", label: "SE-1" } });
      if (url.includes("/guest-sessions")) return json(201, { token: "tok" });
      if (url.includes("/menu")) return json(200, { shop: { id: "s", name: "Slow Express" }, categories: [], toppings: [] });
      return json(404, {});
    }));
    window.history.pushState({}, "", "/t/good-code");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Slow Express menu/)).toBeTruthy());
    expect(calls.some((u) => u.includes("/guest-sessions"))).toBe(true);
    expect(screen.queryByText(/not valid/)).toBeNull();
  });
});
