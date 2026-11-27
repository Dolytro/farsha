import { describe, expect, it } from "vitest";
import { neighbourGaps } from "./measure";

const b = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe("neighbourGaps", () => {
  it("finds the nearest box on each side", () => {
    const g = neighbourGaps(b(100, 100, 50, 50), [b(0, 100, 60, 50), b(0, 100, 80, 50), b(200, 110, 40, 20), b(100, 0, 50, 30), b(105, 400, 10, 10)]);
    expect(g.map((m) => m.value).sort((p, q) => p - q)).toEqual([20, 50, 70, 250]);
  });
  it("ignores boxes that do not overlap across the axis", () => {
    expect(neighbourGaps(b(0, 0, 10, 10), [b(100, 100, 10, 10)])).toEqual([]);
  });
  it("ignores containing and overlapping boxes", () => {
    expect(neighbourGaps(b(10, 10, 10, 10), [b(0, 0, 100, 100), b(15, 15, 10, 10)])).toEqual([]);
  });
});
