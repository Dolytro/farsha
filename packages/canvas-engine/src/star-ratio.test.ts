import { describe, expect, it } from "vitest";
import { starInnerDot, starRatioAt } from "./shapes";

describe("star ratio dot", () => {
  it("round-trips the ratio through the dot position", () => {
    for (const points of [3, 5, 8]) {
      for (const ratio of [0.2, 0.382, 0.7]) {
        expect(starRatioAt(points, starInnerDot(points, ratio))).toBeCloseTo(ratio, 1);
      }
    }
  });
  it("clamps to the allowed range", () => {
    expect(starRatioAt(5, [50, 50])).toBeLessThan(0.15);
    expect(starRatioAt(5, [500, -400])).toBeLessThanOrEqual(0.95);
  });
});
