import { describe, expect, it } from "vitest";
import { snapMove } from "./snap";

const target = { x: 100, y: 100, width: 100, height: 50 };

describe("snapMove", () => {
  it("snaps an edge to a nearby edge and reports a guide", () => {
    const r = snapMove({ x: 103, y: 300, width: 40, height: 40 }, [target], 5);
    expect(r.dx).toBe(-3); // left edge onto 100
    expect(r.dy).toBe(0);
    expect(r.guides).toEqual([{ x1: 100, x2: 100, y1: 100, y2: 340 }]);
  });

  it("snaps centres", () => {
    const r = snapMove({ x: 148, y: 300, width: 4, height: 10 }, [target], 5); // centre 150 -> 150
    expect(r.dx).toBe(0);
    expect(r.guides.some((g) => g.x1 === 150)).toBe(true);
    const s = snapMove({ x: 146, y: 300, width: 10, height: 10 }, [target], 5); // centre 151 -> 150
    expect(s.dx).toBe(-1);
  });

  it("snaps to bare guide lines without drawing a guide for them", () => {
    const r = snapMove({ x: 52, y: 297, width: 40, height: 40 }, [], 5, { xs: [50], ys: [300, 500] });
    expect([r.dx, r.dy]).toEqual([-2, 3]);
    expect(r.guides).toEqual([]);
    const far = snapMove({ x: 80, y: 400, width: 10, height: 10 }, [], 5, { xs: [50], ys: [300] });
    expect([far.dx, far.dy]).toEqual([0, 0]);
  });

  it("does nothing when everything is out of range", () => {
    const r = snapMove({ x: 20, y: 400, width: 10, height: 10 }, [target], 5);
    expect(r).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("snaps both axes and picks the closest line", () => {
    const r = snapMove({ x: 98, y: 98, width: 10, height: 10 }, [target], 5);
    expect([r.dx, r.dy]).toEqual([2, 2]);
    expect(r.guides.length).toBeGreaterThanOrEqual(2);
  });
});
