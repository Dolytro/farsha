import { describe, expect, it } from "vitest";
import { moveGuideTo } from "./guide-edit";

const guides = [{ axis: "x" as const, position: 10 }, { axis: "y" as const, position: 50 }];

describe("moveGuideTo", () => {
  it("moves one guide to the typed position", () => {
    expect(moveGuideTo(guides, 1, "120")).toEqual([guides[0], { axis: "y", position: 120 }]);
  });
  it("rounds and accepts negatives", () => {
    expect(moveGuideTo(guides, 0, " -4.6 ")[0]!.position).toBe(-5);
  });
  it("ignores bad input and unknown guides", () => {
    expect(moveGuideTo(guides, 0, "abc")).toBe(guides);
    expect(moveGuideTo(guides, 0, "")).toBe(guides);
    expect(moveGuideTo(guides, 5, "3")).toBe(guides);
    expect(moveGuideTo(guides, 0, "10")).toBe(guides);
  });
});
