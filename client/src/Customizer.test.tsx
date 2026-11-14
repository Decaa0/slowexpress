import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Customizer from "./Customizer";

const drink = { id: "d1", name: "Thai Milk Tea", priceCents: 4500, imageKey: "thai-milk-tea" };
const toppings = [
  { id: "t1", name: "Cream Cheese", priceCents: 1500, imageKey: "cream-cheese" },
  { id: "t2", name: "Boba Pearls", priceCents: 1000, imageKey: "boba" },
  { id: "t3", name: "Strawberry", priceCents: 1500, imageKey: "strawberry" },
  { id: "t4", name: "Lychee Jelly", priceCents: 1000, imageKey: "lychee-jelly" },
];
const setup = () => render(<Customizer drink={drink} toppings={toppings} onAdd={() => {}} onClose={() => {}} />);
const drop = (id: string) => fireEvent.drop(screen.getByTestId("cup-drop"), { dataTransfer: { getData: () => id } });
afterEach(cleanup);

describe("TEST-30 / AC-30 cup customizer", () => {
  it("dragging Cream Cheese onto the cup adds the layer and updates the estimate", () => {
    setup();
    expect(screen.queryByTestId("layer-cream-cheese")).toBeNull();
    drop("t1");
    expect(screen.getByTestId("layer-cream-cheese")).toBeTruthy();
    expect(screen.getByTestId("estimate").textContent).toBe("฿60");
  });
  it("refuses a 4th topping with a message", () => {
    setup(); drop("t1"); drop("t2"); drop("t3"); drop("t4");
    expect(screen.getByRole("alert").textContent).toContain("Maximum 3");
    expect(screen.queryByTestId("layer-lychee")).toBeNull();
  });
  it("tapping an added topping removes it", () => {
    setup(); fireEvent.click(screen.getByLabelText("topping Boba Pearls"));
    expect(screen.getByTestId("layer-boba")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("topping Boba Pearls"));
    expect(screen.queryByTestId("layer-boba")).toBeNull();
  });
});
