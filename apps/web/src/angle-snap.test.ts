import { describe, expect, it } from "vitest";
import { snapAngle } from "./angle-snap";

describe("snapAngle", () => {
  it("turns a vector to the nearest 45 degrees and keeps its length", () => {
    const a = snapAngle(10, 2);
    expect(a.dy).toBeCloseTo(0);
    expect(a.dx).toBeCloseTo(Math.hypot(10, 2));
    const b = snapAngle(10, 12);
    expect(b.dx).toBeCloseTo(b.dy);
    expect(Math.hypot(b.dx, b.dy)).toBeCloseTo(Math.hypot(10, 12));
  });
  it("handles zero and the other quadrants", () => {
    expect(snapAngle(0, 0)).toEqual({ dx: 0, dy: 0 });
    const c = snapAngle(-3, -20);
    expect(c.dx).toBeCloseTo(0);
    expect(c.dy).toBeCloseTo(-Math.hypot(3, 20));
  });
});
