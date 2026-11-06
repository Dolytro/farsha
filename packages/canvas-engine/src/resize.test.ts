import { describe, expect, it } from "vitest";
import { resizeBox, resizeBoxFlip } from "./resize";

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

describe("resizeBoxFlip", () => {
  const box = { x: 100, y: 100, width: 50, height: 40 };
  it("behaves like resizeBox until the opposite side is passed", () => {
    expect(resizeBoxFlip(box, "e", 10, 0)).toEqual({ box: { x: 100, y: 100, width: 60, height: 40 }, flipX: false, flipY: false });
  });
  it("turns the box over when the east handle goes past the left side", () => {
    const r = resizeBoxFlip(box, "e", -80, 0);
    expect(r.flipX).toBe(true);
    expect(r.box).toEqual({ x: 70, y: 100, width: 30, height: 40 });
  });
  it("turns the box over when the west handle goes past the right side", () => {
    const r = resizeBoxFlip(box, "w", 80, 0);
    expect(r.flipX).toBe(true);
    expect(r.box).toEqual({ x: 150, y: 100, width: 30, height: 40 });
  });
  it("flips each axis on its own from a corner", () => {
    const r = resizeBoxFlip(box, "se", -60, -50);
    expect(r.flipX && r.flipY).toBe(true);
    expect(r.box).toEqual({ x: 90, y: 90, width: 10, height: 10 });
  });
  it("keeps stopping at the opposite side when the ratio is kept", () => {
    const r = resizeBoxFlip(box, "e", -80, 0, { keepRatio: true });
    expect(r.flipX).toBe(false);
    expect(r.box.width).toBeGreaterThanOrEqual(1);
  });
});
