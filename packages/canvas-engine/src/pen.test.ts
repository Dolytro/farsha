import { describe, expect, it } from "vitest";
import { penGeometry, penPathData, type PenPoint } from "./pen";

const corner = (x: number, y: number): PenPoint => ({ x, y, hx: 0, hy: 0 });

describe("pen path", () => {
  it("draws straight segments between corner points", () => {
    expect(penPathData([corner(10, 10), corner(50, 10), corner(50, 40)], false)).toBe("M10 10 L50 10 L50 40");
  });

  it("closes the path with a segment back to the start and Z", () => {
    expect(penPathData([corner(0, 0), corner(10, 0), corner(10, 10)], true)).toBe("M0 0 L10 0 L10 10 L0 0 Z");
  });

  it("uses a cubic curve when a handle is set, mirroring the incoming handle", () => {
    const d = penPathData([{ x: 0, y: 0, hx: 10, hy: 0 }, corner(100, 0)], false);
    expect(d).toBe("M0 0 C10 0 100 0 100 0");
    const both = penPathData([{ x: 0, y: 0, hx: 10, hy: 0 }, { x: 100, y: 0, hx: 20, hy: 0 }], false);
    expect(both).toBe("M0 0 C10 0 80 0 100 0");
  });

  it("shifts the coordinates by the origin", () => {
    expect(penPathData([corner(10, 10), corner(20, 30)], false, 10, 10)).toBe("M0 0 L10 20");
  });
});

describe("penGeometry", () => {
  it("needs at least two points", () => expect(penGeometry([corner(1, 1)], false)).toBeNull());

  it("fits the box to the points and positions the path inside it", () => {
    const g = penGeometry([corner(10, 20), corner(60, 20), corner(60, 50)], false)!;
    expect(g.box).toEqual({ x: 10, y: 20, width: 50, height: 30 });
    expect(g.viewBox).toBe("0 0 50 30");
    expect(g.markup).toContain('d="M0 0 L50 0 L50 30"');
  });

  it("keeps a flat line at least 1 unit tall", () => {
    const g = penGeometry([corner(0, 5), corner(40, 5)], false)!;
    expect(g.box.height).toBe(1);
  });

  it("measures the real curve, not the control points", () => {
    const g = penGeometry([{ x: 0, y: 0, hx: 0, hy: 100 }, { x: 100, y: 0, hx: 0, hy: -100 }], false)!;
    // the curve bulges to y = 75 but the control points are at y = 100
    expect(g.box.height).toBeLessThan(100);
    expect(g.box.height).toBeGreaterThan(60);
  });
});
