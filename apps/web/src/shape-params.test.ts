import { describe, expect, it } from "vitest";
import { polygonPatch, startShapeParams } from "./shape-params";

const pointCount = (markup: string) => (/points="([^"]*)"/.exec(markup)?.[1] ?? "").trim().split(/\s+/).length;

describe("polygonPatch", () => {
  it("makes a polygon with the requested number of sides", () => {
    const p = polygonPatch("POLYGON", 6);
    expect(p).toMatchObject({ shapeKind: "POLYGON", shapeSides: 6 });
    expect(pointCount(p.markup as string)).toBe(6);
    expect(p.starRatio).toBeUndefined();
  });

  it("makes a star with twice as many points as tips, and remembers the ratio", () => {
    const p = polygonPatch("STAR", 7, 0.5);
    expect(p).toMatchObject({ shapeKind: "STAR", shapeSides: 7, starRatio: 0.5 });
    expect(pointCount(p.markup as string)).toBe(14);
  });

  it("keeps the numbers in range and survives bad input", () => {
    expect(polygonPatch("POLYGON", 1).shapeSides).toBe(3);
    expect(polygonPatch("POLYGON", 500).shapeSides).toBe(60);
    expect(polygonPatch("POLYGON", 4.6).shapeSides).toBe(5);
    expect(polygonPatch("POLYGON", NaN).shapeSides).toBe(3);
    expect(polygonPatch("STAR", 5, 5).starRatio).toBe(0.95);
    expect(polygonPatch("STAR", 5, -1).starRatio).toBe(0.05);
    expect(polygonPatch("STAR", 5, NaN).starRatio).toBe(0.382);
  });

  it("new layers start as a triangle or a five point star", () => {
    expect(startShapeParams("POLYGON")).toEqual({ shapeKind: "POLYGON", shapeSides: 3 });
    expect(startShapeParams("STAR")).toEqual({ shapeKind: "STAR", shapeSides: 5, starRatio: 0.382 });
  });
});
