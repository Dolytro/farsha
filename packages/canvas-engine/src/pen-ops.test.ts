import { describe, expect, it } from "vitest";
import { joinPenPaths, simplifyPenPoints, smoothPenPoints } from "./pen-ops";

const corner = (x: number, y: number) => ({ x, y, hx: 0, hy: 0 });

describe("simplifyPenPoints", () => {
  it("drops points that lie on a line", () => {
    const line = Array.from({ length: 10 }, (_, i) => corner(i * 10, 0));
    expect(simplifyPenPoints(line, false)).toHaveLength(2);
  });
  it("keeps a path with fewer than three points", () => {
    const two = [corner(0, 0), corner(10, 10)];
    expect(simplifyPenPoints(two, false)).toBe(two);
  });
});

describe("smoothPenPoints", () => {
  it("adds handles in the middle and keeps the ends sharp", () => {
    const out = smoothPenPoints([corner(0, 0), corner(10, 20), corner(20, 0)], false);
    expect(out[0]).toMatchObject({ hx: 0, hy: 0 });
    expect(out[2]).toMatchObject({ hx: 0, hy: 0 });
    expect(out[1]!.hx).toBeCloseTo(20 / 6);
    expect(out[1]!.hy).toBeCloseTo(0);
  });
  it("smooths every point of a closed path", () => {
    expect(smoothPenPoints([corner(0, 0), corner(10, 0), corner(10, 10), corner(0, 10)], true).every((p) => p.hx !== 0 || p.hy !== 0)).toBe(true);
  });
});

describe("joinPenPaths", () => {
  it("joins the nearest ends into one path with a merged point", () => {
    const a = [corner(0, 0), corner(10, 0)];
    const b = [corner(10, 2), corner(20, 2)];
    const out = joinPenPaths(a, b);
    expect(out).toHaveLength(3);
    expect(out[1]).toMatchObject({ x: 10, y: 1 });
  });
  it("reverses a path when its other end is nearer", () => {
    const a = [corner(0, 0), corner(10, 0)];
    const b = [corner(30, 0), corner(10, 0)];
    const out = joinPenPaths(a, b);
    expect(out.map((p) => p.x)).toEqual([0, 10, 30]);
  });
});
