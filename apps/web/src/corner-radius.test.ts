import { describe, expect, it } from "vitest";
import { cornerDot, cornerProgress, draggedRadius, withCornerRadius } from "./corner-radius";

const box = { x: 100, y: 100, width: 200, height: 80 };

describe("corner radius handles", () => {
  it("measures progress into the shape from each corner", () => {
    expect(cornerProgress(box, 0, { x: 110, y: 130 })).toBe(20);
    expect(cornerProgress(box, 2, { x: 290, y: 170 })).toBe(10);
    expect(cornerProgress(box, 1, { x: 310, y: 100 })).toBe(-5);
  });
  it("follows the pointer from where the drag began and stays inside 0 and half the short side", () => {
    expect(draggedRadius(box, 0, 8, { x: 108, y: 108 }, { x: 118, y: 118 })).toBe(18);
    expect(draggedRadius(box, 0, 8, { x: 108, y: 108 }, { x: 0, y: 0 })).toBe(0);
    expect(draggedRadius(box, 0, 8, { x: 108, y: 108 }, { x: 290, y: 170 })).toBe(40);
  });
  it("puts the dot at the radius or the minimum inset", () => {
    expect(cornerDot(box, 0, 4, 16)).toEqual({ x: 116, y: 116 });
    expect(cornerDot(box, 2, 30, 16)).toEqual({ x: 270, y: 150 });
  });
  it("sets one corner and keeps the rest", () => {
    expect(withCornerRadius([1, 2, 3, 4], 2, 9)).toEqual([1, 2, 9, 4]);
  });
});
