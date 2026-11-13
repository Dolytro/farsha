import { describe, expect, it } from "vitest";
import { gradientLine, stopPositionAt } from "./gradient-line";

const box = { x: 100, y: 50, width: 200, height: 100 };

describe("gradientLine", () => {
  it("runs left to right through the middle at 0 degrees", () => {
    expect(gradientLine(box, 0)).toEqual({ x1: 100, y1: 100, x2: 300, y2: 100 });
  });
  it("runs top to bottom at 90 degrees", () => {
    const l = gradientLine(box, 90);
    expect(l.x1).toBeCloseTo(200);
    expect(l.y1).toBeCloseTo(50);
    expect(l.y2).toBeCloseTo(150);
  });
  it("treats a bad angle as 0", () => {
    expect(gradientLine(box, Number.NaN)).toEqual(gradientLine(box, 0));
  });
});

describe("stopPositionAt", () => {
  const line = gradientLine(box, 0);
  it("measures along the line", () => {
    expect(stopPositionAt(line, { x: 100, y: 100 })).toBe(0);
    expect(stopPositionAt(line, { x: 200, y: 300 })).toBe(0.5);
    expect(stopPositionAt(line, { x: 300, y: 0 })).toBe(1);
  });
  it("keeps the result between 0 and 1", () => {
    expect(stopPositionAt(line, { x: -500, y: 100 })).toBe(0);
    expect(stopPositionAt(line, { x: 900, y: 100 })).toBe(1);
  });
  it("is 0 for a line with no length", () => {
    expect(stopPositionAt({ x1: 1, y1: 1, x2: 1, y2: 1 }, { x: 5, y: 5 })).toBe(0);
  });
});
