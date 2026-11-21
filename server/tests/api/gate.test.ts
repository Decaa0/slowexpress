import { describe, it, expect } from "vitest";

// Lab 5.6 throwaway: this test fails on purpose to prove the merge gate on main.
// The PR is closed without merging and the branch is deleted.
describe("merge gate proof", () => {
  it("fails on purpose", () => {
    expect(1 + 1).toBe(3);
  });
});
