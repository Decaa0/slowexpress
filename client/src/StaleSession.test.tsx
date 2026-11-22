import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import App from "./App";
import { setSession } from "./api";

const calls: string[] = [];
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
beforeEach(() => { calls.length = 0; setSession(null); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.pushState({}, "", "/"); });

describe("stale member login on a table link", () => {
  it("drops the dead login and starts a guest session instead of a dead end", async () => {
    setSession({ token: "expired", kind: "user" });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("/tables/")) return json(200, { shop: { id: "s", name: "Slow Express" }, table: { id: "t", label: "SE-1" } });
      if (url.includes("/auth/me")) return json(401, { error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
      if (url.includes("/guest-sessions")) return json(201, { token: "fresh-guest" });
      if (url.includes("/menu")) return json(200, { shop: { id: "s", name: "Slow Express" }, categories: [], toppings: [] });
      return json(404, {});
    }));
    window.history.pushState({}, "", "/t/good-code");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Slow Express menu/)).toBeTruthy());
    expect(calls.some((u) => u.includes("/guest-sessions"))).toBe(true);
    expect(screen.queryByText(/Scan a table QR code/)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem("session")!)).toMatchObject({ token: "fresh-guest", kind: "guest" });
  });
});
