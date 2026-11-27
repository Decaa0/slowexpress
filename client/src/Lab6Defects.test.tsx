import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import App from "./App";
import { setSession, getSession } from "./api";

// Lab 6 UAT findings on release 47a6648 (reporter: partner UAT team).
const calls: { url: string; method: string; body?: string }[] = [];
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
const tables: Record<string, { shop: string; table: string }> = { "demo-se-1": { shop: "Slow Express", table: "SE-1" }, "demo-dc-1": { shop: "Demo Cafe", table: "DC-1" } };
let guestCounter = 0;
function server(opts: { logoutFails?: boolean } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
    const m = url.match(/\/tables\/([^/?]+)/);
    if (m) return tables[m[1]] ? json(200, { shop: { id: "s", name: tables[m[1]].shop }, table: { id: "t", label: tables[m[1]].table } }) : json(404, { error: { code: "NOT_FOUND", message: "no" } });
    if (url.includes("/guest-sessions")) { const code = JSON.parse(init!.body as string).tableCode; return json(201, { token: `guest-${code}-${++guestCounter}` }); }
    if (url.includes("/auth/login")) return json(200, { token: "member-token", user: { id: "u", fullName: "Alice", role: "MEMBER", shopId: null } });
    if (url.includes("/auth/me")) return json(200, { id: "u", fullName: "Alice", role: "MEMBER", shopId: null, points: 0 });
    if (url.includes("/auth/logout")) { if (opts.logoutFails) throw new TypeError("net::ERR_ABORTED"); return json(204, {}); }
    if (url.includes("/menu")) { const tok = ((init?.headers ?? {}) as Record<string, string>).Authorization ?? ""; const shop = tok.includes("demo-dc-1") ? "Demo Cafe" : "Slow Express"; return json(200, { shop: { id: "s", name: shop }, categories: [], toppings: [] }); }
    if (url.includes("/rewards")) return json(200, { points: 0, redemptionRate: 100, history: [] });
    if (url.includes("/orders")) return json([] as never, []) ;
    return json(404, {});
  }));
}
beforeEach(() => { calls.length = 0; guestCounter = 0; setSession(null); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.pushState({}, "\\", "/"); });

describe("DEF-SE-01: opening a different table link must not reuse the previous table's guest session", () => {
  it("creates a new guest session for demo-dc-1 after demo-se-1", async () => {
    server();
    window.history.pushState({}, "", "/t/demo-se-1");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Slow Express menu/)).toBeTruthy());
    expect(getSession()?.token).toMatch(/guest-demo-se-1/);
    cleanup(); // the visitor navigates to another table link (same browser tab, sessionStorage is kept)
    window.history.pushState({}, "", "/t/demo-dc-1");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Table DC-1/)).toBeTruthy());
    const posts = calls.filter((c) => c.url.includes("/guest-sessions")).map((c) => JSON.parse(c.body!).tableCode);
    expect(posts).toEqual(["demo-se-1", "demo-dc-1"]);
    expect(getSession()?.token).toMatch(/guest-demo-dc-1/);
  });
  it("keeps the same guest session when the same table link is reloaded", async () => {
    server();
    window.history.pushState({}, "", "/t/demo-se-1");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Slow Express menu/)).toBeTruthy());
    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Slow Express menu/)).toBeTruthy());
    expect(calls.filter((c) => c.url.includes("/guest-sessions")).length).toBe(1);
  });
});

describe("DEF-SE-02: logging out on a table link returns to a working guest session", () => {
  for (const logoutFails of [false, true]) {
    it(`logout ${logoutFails ? "when the request is aborted" : "normally"} keeps the menu and Member sign in usable`, async () => {
      server({ logoutFails });
      setSession({ token: "member-token", kind: "user" });
      window.history.pushState({}, "", "/t/demo-se-1");
      render(<App />);
      const btn = await screen.findByText("Logout");
      fireEvent.click(btn);
      await waitFor(() => expect(screen.getByText("Member sign in")).toBeTruthy());
      await waitFor(() => expect(getSession()?.kind).toBe("guest"));
      expect(screen.queryByText(/Scan a table QR code/)).toBeNull();
      fireEvent.click(screen.getByText("Member sign in"));
      await waitFor(() => expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0));
      expect(screen.queryByText(/Scan a table QR code/)).toBeNull();
    });
  }
});
