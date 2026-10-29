import { describe, expect, it } from "vitest";
import { resizeBox } from "./resize";

const box = { x: 100, y: 50, width: 200, height: 100 };

describe("resizeBox", () => {
  it("drags a corner with the opposite corner fixed", () => {
    expect(resizeBox(box, "se", 20, 10)).toEqual({ x: 100, y: 50, width: 220, height: 110 });
    expect(resizeBox(box, "nw", 20, 10)).toEqual({ x: 120, y: 60, width: 180, height: 90 });
  });

  it("drags a side handle on one axis only", () => {
    expect(resizeBox(box, "e", 30, 99)).toEqual({ x: 100, y: 50, width: 230, height: 100 });
    expect(resizeBox(box, "w", -30, 99)).toEqual({ x: 70, y: 50, width: 230, height: 100 });
    expect(resizeBox(box, "n", 99, -10)).toEqual({ x: 100, y: 40, width: 200, height: 110 });
    expect(resizeBox(box, "s", 99, 10)).toEqual({ x: 100, y: 50, width: 200, height: 110 });
  });

  it("keeps the ratio with Shift", () => {
    const r = resizeBox(box, "se", 40, 0, { keepRatio: true });
    expect(r).toEqual({ x: 100, y: 50, width: 240, height: 120 });
    const s = resizeBox(box, "e", 100, 0, { keepRatio: true }); // other axis scales about the centre
    expect(s).toEqual({ x: 100, y: 25, width: 300, height: 150 });
  });

  it("resizes from the centre with Alt", () => {
    expect(resizeBox(box, "e", 20, 0, { fromCenter: true })).toEqual({ x: 80, y: 50, width: 240, height: 100 });
    expect(resizeBox(box, "se", 10, 10, { fromCenter: true })).toEqual({ x: 90, y: 40, width: 220, height: 120 });
  });

  it("never collapses below 1", () => {
    const r = resizeBox(box, "e", -500, 0);
    expect(r.width).toBe(1);
  });
});
