import { describe, expect, it } from "vitest";
import { snapBoxToPixels, snapMoveToPixels } from "./pixel-snap";

describe("snapBoxToPixels", () => {
  it("puts every edge on a whole pixel", () => {
    expect(snapBoxToPixels({ x: 10.4, y: 20.6, width: 30.2, height: 40.7 })).toEqual({ x: 10, y: 21, width: 31, height: 40 });
  });
  it("never shrinks below one pixel", () => {
    expect(snapBoxToPixels({ x: 5.2, y: 5.2, width: 0.1, height: 0.2 })).toEqual({ x: 5, y: 5, width: 1, height: 1 });
  });
  it("leaves a box on whole pixels alone", () => {
    expect(snapBoxToPixels({ x: -3, y: 8, width: 12, height: 9 })).toEqual({ x: -3, y: 8, width: 12, height: 9 });
  });
});

describe("snapMoveToPixels", () => {
  it("moves a layer so its position is a whole number", () => {
    expect(snapMoveToPixels({ x: 10.5, y: 3 }, { dx: 4.2, dy: 7.6 })).toEqual({ dx: 4.5, dy: 8 });
  });
  it("keeps negative positions working", () => {
    const m = snapMoveToPixels({ x: 0, y: 0 }, { dx: -7.4, dy: -0.4 });
    expect(m.dx).toBe(-7);
    expect(Object.is(m.dy, 0) || m.dy === 0).toBe(true);
  });
});
