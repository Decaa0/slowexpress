import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Cup from "./Cup";

afterEach(cleanup);

describe("release B: cup picture shows every topping and is sized by layout", () => {
  it.each([["aloe", "layer-aloe"], ["whipped", "layer-whipped"], ["cream-cheese", "layer-cream-cheese"], ["boba", "layer-boba"], ["strawberry", "layer-strawberry"], ["lychee-jelly", "layer-lychee"]])(
    "topping %s adds its own layer to the picture", (key, testId) => {
      const { rerender } = render(<Cup drinkKey="thai-milk-tea" toppings={[]} />);
      expect(screen.queryByTestId(testId)).toBeNull();
      rerender(<Cup drinkKey="thai-milk-tea" toppings={[key]} />);
      expect(screen.getByTestId(testId)).toBeTruthy();
    });
  it("the height prop sets the real picture size (no CSS transform that overlaps the name)", () => {
    const { container } = render(<Cup drinkKey="americano" toppings={[]} height={104} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("height")).toBe("104");
    expect(svg.getAttribute("width")).toBe("66");
  });
  it("new drink colours are defined", () => {
    for (const k of ["brown-sugar-milk-tea", "taro-milk-tea", "strawberry-green", "passion-fruit", "cappuccino", "iced-mocha"]) {
      const { container } = render(<Cup drinkKey={k} toppings={[]} />);
      expect(container.querySelector("[data-testid=liquid]")!.getAttribute("fill")).not.toBe("#d9b38c");
      cleanup();
    }
  });
});
