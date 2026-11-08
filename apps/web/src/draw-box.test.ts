import { describe, expect, it } from "vitest";
import { drawBox } from "./draw-box";

describe("drawBox", () => {
  const start = { x: 100, y: 100 };
  it("is the box between the two points in any direction", () => {
    expect(drawBox(start, { x: 160, y: 130 })).toEqual({ x: 100, y: 100, width: 60, height: 30 });
    expect(drawBox(start, { x: 40, y: 70 })).toEqual({ x: 40, y: 70, width: 60, height: 30 });
    expect(drawBox(start, { x: 160, y: 70 })).toEqual({ x: 100, y: 70, width: 60, height: 30 });
  });
  it("Shift makes a square from the longer side, growing the way the pointer went", () => {
    expect(drawBox(start, { x: 160, y: 130 }, { shift: true })).toEqual({ x: 100, y: 100, width: 60, height: 60 });
    expect(drawBox(start, { x: 70, y: 40 }, { shift: true })).toEqual({ x: 40, y: 40, width: 60, height: 60 });
  });
  it("Alt draws from the centre", () => {
    expect(drawBox(start, { x: 120, y: 110 }, { alt: true })).toEqual({ x: 80, y: 90, width: 40, height: 20 });
  });
  it("Shift and Alt together make a square round the start", () => {
    expect(drawBox(start, { x: 130, y: 110 }, { shift: true, alt: true })).toEqual({ x: 70, y: 70, width: 60, height: 60 });
  });
  it("never smaller than one pixel", () => {
    expect(drawBox(start, start)).toEqual({ x: 100, y: 100, width: 1, height: 1 });
    expect(drawBox(start, start, { alt: true })).toMatchObject({ width: 1, height: 1 });
  });
});
