import { describe, expect, it } from "vitest";
import { arrowShape, lineBetween, lineShape, polygonPoints, polygonShape, starShape } from "./shapes";

describe("polygon and star points", () => {
  it("fills the 100 x 100 box", () => {
    for (const pts of [polygonPoints(3), polygonPoints(6), polygonPoints(5, 0.382)]) {
      expect(Math.min(...pts.map((p) => p[0]))).toBeCloseTo(0);
      expect(Math.max(...pts.map((p) => p[0]))).toBeCloseTo(100);
      expect(Math.min(...pts.map((p) => p[1]))).toBeCloseTo(0);
      expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(100);
    }
  });
  it("has the right number of corners", () => {
    expect(polygonPoints(3)).toHaveLength(3);
    expect(polygonPoints(5, 0.5)).toHaveLength(10);
  });
  it("builds polygon and star markup", () => {
    expect(polygonShape().markup).toMatch(/^<polygon points="[\d.,\s]+" vector-effect="non-scaling-stroke"\/>$/);
    expect(starShape().viewBox).toBe("0 0 100 100");
  });
});

describe("line and arrow", () => {
  it("lines get a hair-thin viewBox so a zero-height box still draws", () => {
    expect(lineShape(120).viewBox).toBe("0 0 120 0.001");
    expect(lineShape(120).markup).toContain("M0 0H120");
  });
  it("arrows end in a head", () => {
    expect(arrowShape(100).markup).toContain("L100 0");
  });
  it("places a horizontal line between two points", () => {
    expect(lineBetween(10, 20, 110, 20)).toMatchObject({ x: 10, y: 20, length: 100, rotation: 0 });
  });
  it("rotates around the centre so the start stays where it was drawn", () => {
    const l = lineBetween(0, 0, 0, 100);
    expect(l.rotation).toBeCloseTo(90);
    // centre of the layer is the midpoint (0, 50)
    expect(l.x + l.length / 2).toBeCloseTo(0);
    expect(l.y).toBeCloseTo(50);
  });
  it("snaps the angle to 15 degrees with Shift", () => {
    expect(lineBetween(0, 0, 100, 10, true).rotation).toBe(0);
    expect(lineBetween(0, 0, 100, 30, true).rotation).toBe(15);
  });
});
