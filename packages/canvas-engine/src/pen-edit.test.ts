import { describe, expect, it } from "vitest";
import { insertPointAt, nearestOnPath, removePointAt, scalePoints, translatePoints, type PenPoint } from "./pen";

const corner = (x: number, y: number): PenPoint => ({ x, y, hx: 0, hy: 0 });

describe("pen path editing", () => {
  it("scales and translates points and handles", () => {
    const p = scalePoints([{ x: 10, y: 20, hx: 4, hy: 6 }], 2, 3)[0]!;
    expect(p).toEqual({ x: 20, y: 60, hx: 8, hy: 18 });
    expect(translatePoints([corner(1, 2)], 10, 20)[0]).toMatchObject({ x: 11, y: 22 });
  });

  it("finds the closest spot on a straight segment within the tolerance", () => {
    const hit = nearestOnPath([corner(0, 0), corner(100, 0)], false, 40, 3, 6)!;
    expect(hit.segment).toBe(0);
    expect(hit.x).toBeCloseTo(40);
    expect(hit.distance).toBeCloseTo(3);
    expect(nearestOnPath([corner(0, 0), corner(100, 0)], false, 40, 30, 6)).toBeNull();
  });

  it("includes the closing segment of a closed path", () => {
    const tri = [corner(0, 0), corner(100, 0), corner(50, 100)];
    expect(nearestOnPath(tri, false, 25, 50, 3)).toBeNull();
    expect(nearestOnPath(tri, true, 25, 50, 3)!.segment).toBe(2);
  });

  it("follows a curve", () => {
    const curve = [{ x: 0, y: 0, hx: 0, hy: 100 }, corner(100, 0)];
    // at t = 0.5 the curve is at about (50, 37.5)
    const hit = nearestOnPath(curve, false, 50, 37.5, 4)!;
    expect(hit).not.toBeNull();
    expect(hit.t).toBeCloseTo(0.5, 1);
  });

  it("inserts a corner point on a straight segment", () => {
    const next = insertPointAt([corner(0, 0), corner(100, 0), corner(100, 100)], 0, 0.25);
    expect(next).toHaveLength(4);
    expect(next[1]).toEqual({ x: 25, y: 0, hx: 0, hy: 0 });
  });

  it("inserts a smooth point on a curve and into a closing segment", () => {
    const next = insertPointAt([{ x: 0, y: 0, hx: 0, hy: 100 }, corner(100, 0)], 0, 0.5);
    expect(next[1]!.x).toBeCloseTo(50);
    expect(Math.hypot(next[1]!.hx, next[1]!.hy)).toBeGreaterThan(0);
    const closed = insertPointAt([corner(0, 0), corner(100, 0), corner(50, 100)], 2, 0.5);
    expect(closed).toHaveLength(4);
    expect(closed[3]).toMatchObject({ x: 25, y: 50 });
  });

  it("removes points but keeps at least two", () => {
    expect(removePointAt([corner(0, 0), corner(1, 1), corner(2, 2)], 1)).toHaveLength(2);
    expect(removePointAt([corner(0, 0), corner(1, 1)], 0)).toHaveLength(2);
  });
});
