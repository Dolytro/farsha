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

import { resizeRotatedBox } from "./resize";

describe("resizeRotatedBox", () => {
  const box = { x: 0, y: 0, width: 100, height: 50 };
  const close = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
    for (const k of ["x", "y", "width", "height"] as const) expect(a[k]).toBeCloseTo(b[k], 6);
  };

  it("is the ordinary resize when the layer is not turned", () => {
    close(resizeRotatedBox(box, "se", 20, 10, 0), resizeBox(box, "se", 20, 10));
    close(resizeRotatedBox(box, "w", -30, 0, 0), resizeBox(box, "w", -30, 0));
  });

  it("grows along the layer's own side when it is turned a quarter turn, keeping the far edge in place", () => {
    // east handle of a layer turned 90 degrees points down the canvas: dragging down 20 widens it by 20
    const r = resizeRotatedBox(box, "e", 0, 20, 90);
    close(r, { x: -10, y: 10, width: 120, height: 50 });
  });

  it("keeps the opposite corner fixed on the canvas for any angle", () => {
    const rot = 30;
    const a = (rot * Math.PI) / 180;
    const world = (b: typeof box, p: { x: number; y: number }) => {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      return { x: cx + p.x * Math.cos(a) - p.y * Math.sin(a), y: cy + p.x * Math.sin(a) + p.y * Math.cos(a) };
    };
    const before = world(box, { x: -50, y: -25 }); // the nw corner is opposite the se handle
    const next = resizeRotatedBox(box, "se", 17, 9, rot);
    const after = world(next, { x: -next.width / 2, y: -next.height / 2 });
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(next.width).toBeGreaterThan(box.width - 1);
  });

  it("with Alt the centre stays put", () => {
    const r = resizeRotatedBox(box, "e", 15, 0, 45, { fromCenter: true });
    expect(r.x + r.width / 2).toBeCloseTo(50, 6);
    expect(r.y + r.height / 2).toBeCloseTo(25, 6);
  });

  it("never gets smaller than one pixel", () => {
    const r = resizeRotatedBox(box, "e", -500, 0, 0);
    expect(r.width).toBe(1);
  });
});
