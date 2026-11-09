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

import { snapResize } from "./snap";

describe("snapResize", () => {
  const target = { x: 200, y: 0, width: 100, height: 100 };

  it("snaps the right edge dragged by an east handle and leaves the left edge", () => {
    const r = snapResize({ x: 100, y: 0, width: 97, height: 50 }, "e", [target], 5);
    expect(r.box).toEqual({ x: 100, y: 0, width: 100, height: 50 });
    expect(r.guides.some((g) => g.x1 === 200 && g.x2 === 200)).toBe(true);
  });

  it("snaps the left edge dragged by a west handle and keeps the right edge fixed", () => {
    const r = snapResize({ x: 203, y: 0, width: 97, height: 50 }, "w", [target], 5);
    expect(r.box.x).toBe(200);
    expect(r.box.x + r.box.width).toBe(300);
  });

  it("snaps both edges of a corner handle, to centres as well", () => {
    const r = snapResize({ x: 0, y: 0, width: 248, height: 52 }, "se", [target], 5);
    expect(r.box.width).toBe(250); // the target's centre line
    expect(r.box.height).toBe(50); // the target's middle line
  });

  it("does nothing out of range, never touches edges that are not dragged, and keeps sizes at 1 or more", () => {
    expect(snapResize({ x: 0, y: 0, width: 150, height: 50 }, "e", [target], 5).box.width).toBe(150);
    expect(snapResize({ x: 0, y: 0, width: 197, height: 52 }, "e", [target], 5).box.height).toBe(52);
    expect(snapResize({ x: 0, y: 0, width: 2, height: 50 }, "e", [{ x: -3, y: 0, width: 1, height: 1 }], 10).box.width).toBeGreaterThanOrEqual(1);
  });

  it("also snaps to ruler guides", () => {
    expect(snapResize({ x: 0, y: 0, width: 118, height: 40 }, "e", [], 5, { xs: [120] }).box.width).toBe(120);
  });
});

describe("equal spacing while moving", () => {
  const left = { x: 0, y: 0, width: 50, height: 50 };
  const right = { x: 200, y: 0, width: 50, height: 50 };

  it("snaps a box between two layers to the middle of the gap", () => {
    // gaps are 50 and 60 around a 40 wide box: moving it 5 to the right makes both 55
    const r = snapMove({ x: 100, y: 5, width: 40, height: 40 }, [left, right], 8);
    expect(r.dx).toBe(5);
    // the two gaps are marked (the box is also centred on the layers, which adds their alignment guides)
    expect(r.guides).toEqual(expect.arrayContaining([expect.objectContaining({ x1: 50, x2: 105, y1: 25, y2: 25 }), expect.objectContaining({ x1: 145, x2: 200, y1: 25, y2: 25 })]));
  });

  it("does not snap when the box is further than the threshold from the middle", () => {
    expect(snapMove({ x: 80, y: 5, width: 40, height: 40 }, [left, right], 8).dx).toBe(0);
  });

  it("works above and below too", () => {
    const top = { x: 0, y: 0, width: 50, height: 50 };
    const bottom = { x: 0, y: 200, width: 50, height: 50 };
    const r = snapMove({ x: 5, y: 100, width: 40, height: 40 }, [top, bottom], 8);
    expect(r.dy).toBe(5);
    expect(r.guides.some((g) => g.y1 === 50 && g.y2 === 105)).toBe(true);
    expect(r.guides.some((g) => g.y1 === 145 && g.y2 === 200)).toBe(true);
  });

  it("needs layers that overlap the box across the other axis", () => {
    const farUp = { ...left, y: -500 };
    expect(snapMove({ x: 100, y: 5, width: 40, height: 40 }, [farUp, right], 8).dx).toBe(0);
  });

  it("leaves a box alone that is already lined up with an edge, instead of nudging it to the middle", () => {
    // its left edge sits exactly on the left layer's right edge: alignment wins
    const r = snapMove({ x: 50, y: 5, width: 40, height: 40 }, [left, right], 8);
    expect(r.dx).toBe(0);
  });
});
