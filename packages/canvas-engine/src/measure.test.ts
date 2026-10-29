import { describe, expect, it } from "vitest";
import { measure, unionBox } from "./measure";
import { fitBox, zoomTo } from "./fit";
import { screenToWorld } from "./viewport";

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe("measure", () => {
  it("shows the four inner gaps when one box contains the other", () => {
    const m = measure(box(20, 30, 50, 40), box(0, 0, 200, 100));
    expect(m.map((d) => d.value).sort((a, b) => a - b)).toEqual([20, 30, 30, 130]);
  });

  it("shows only the horizontal gap for boxes side by side", () => {
    const m = measure(box(0, 0, 50, 50), box(80, 10, 50, 30));
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ x1: 50, x2: 80, value: 30, y1: 25, y2: 25 });
  });

  it("shows both gaps for diagonal boxes", () => {
    const m = measure(box(0, 0, 10, 10), box(30, 50, 10, 10));
    expect(m.map((d) => d.value).sort((a, b) => a - b)).toEqual([20, 40]);
  });

  it("shows edge offsets for partially overlapping boxes", () => {
    const m = measure(box(0, 0, 100, 100), box(40, 60, 100, 100));
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((d) => d.value > 0)).toBe(true);
  });
});

describe("unionBox / fitBox / zoomTo", () => {
  it("unions boxes", () => {
    expect(unionBox([box(0, 0, 10, 10), box(20, 20, 10, 10)])).toEqual(box(0, 0, 30, 30));
    expect(unionBox([])).toBeUndefined();
  });

  it("centres a box in the screen", () => {
    const v = fitBox(box(100, 100, 200, 100), 800, 600, 0);
    const c = screenToWorld(v, 400, 300);
    expect(c.x).toBeCloseTo(200);
    expect(c.y).toBeCloseTo(150);
    expect(v.zoom).toBeCloseTo(4);
  });

  it("zooms around the screen centre", () => {
    const v = { x: 50, y: 20, zoom: 1 };
    const before = screenToWorld(v, 400, 300);
    const after = screenToWorld(zoomTo(v, 2, 800, 600), 400, 300);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});
