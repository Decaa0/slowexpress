import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import App from "./App";
import { setSession } from "./api";

// Lab 6 DEF-SE-03: the banner must show the shop of the operator / table, not a fixed "Slow Express".
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
beforeEach(() => { setSession(null); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.pushState({}, "", "/"); });

describe("DEF-SE-03: shop name in the banner", () => {
  it("staff page of a Demo Cafe operator shows Demo Cafe", async () => {
    setSession({ token: "t", kind: "user" });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/auth/me")) return json(200, { id: "u", fullName: "Demo Cafe Staff", role: "OPERATOR", shopId: "c", shopName: "Demo Cafe" });
      if (url.includes("/orders")) return json(200, []);
      return json(404, {});
    }));
    window.history.pushState({}, "", "/staff");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Demo Cafe Staff/)).toBeTruthy());
    const brand = document.querySelector(".brand")!;
    expect(brand.textContent).toContain("Demo Cafe");
    expect(brand.textContent).not.toContain("Slow Express");
  });

  it("table page of Demo Cafe shows Demo Cafe, Table DC-1", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/tables/")) return json(200, { shop: { id: "c", name: "Demo Cafe" }, table: { id: "t", label: "DC-1" } });
      if (url.includes("/guest-sessions")) return json(201, { token: "g" });
      if (url.includes("/menu")) return json(200, { shop: { id: "c", name: "Demo Cafe" }, categories: [], toppings: [] });
      return json(404, {});
    }));
    window.history.pushState({}, "", "/t/demo-dc-1");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Table DC-1/)).toBeTruthy());
    expect(document.querySelector(".brand")!.textContent).toContain("Demo Cafe");
  });
});
