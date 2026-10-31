import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { booleanShapes } from "./boolean";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 100, height: 100 } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 50, y: 50, width: 100, height: 100 } });
  return { doc, page, a, b };
}

describe("boolean operations", () => {
  it("union covers both rectangles", () => {
    const { doc, a, b } = setup();
    const r = booleanShapes(doc, [a, b], "UNION")!;
    expect(r.box).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    expect(r.rings).toHaveLength(1);
    expect(r.rings[0]).toHaveLength(8); // an L-shaped union has 8 corners
  });

  it("intersect keeps only the overlap", () => {
    const { doc, a, b } = setup();
    const r = booleanShapes(doc, [a, b], "INTERSECT")!;
    expect(r.box).toEqual({ x: 50, y: 50, width: 50, height: 50 });
  });

  it("subtract removes the upper shapes from the bottom one", () => {
    const { doc, a, b } = setup();
    const r = booleanShapes(doc, [a, b], "SUBTRACT")!;
    expect(r.box).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(r.rings[0]).toHaveLength(6);
  });

  it("exclude leaves both outer parts and no overlap", () => {
    const { doc, a, b } = setup();
    const r = booleanShapes(doc, [a, b], "EXCLUDE")!;
    expect(r.box).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    expect(r.rings.length).toBeGreaterThanOrEqual(2);
  });

  it("subtracting a contained shape leaves a hole", () => {
    const { doc, page, a } = setup();
    const hole = doc.createNode("ELLIPSE", { parentId: page, props: { x: 25, y: 25, width: 50, height: 50 } });
    const r = booleanShapes(doc, [a, hole], "SUBTRACT")!;
    expect(r.rings).toHaveLength(2);
    expect(r.d.match(/M/g)).toHaveLength(2);
  });

  it("returns null when the shapes do not overlap for an intersection", () => {
    const { doc, page, a } = setup();
    const far = doc.createNode("RECTANGLE", { parentId: page, props: { x: 500, y: 500, width: 10, height: 10 } });
    expect(booleanShapes(doc, [a, far], "INTERSECT")).toBeNull();
  });

  it("uses the position inside frames, rotation and flips", () => {
    const { doc, page } = setup();
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 1000, y: 0, width: 300, height: 300 } });
    const r1 = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 100, height: 20 } });
    const r2 = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 100, height: 20, rotation: 90 } });
    const r = booleanShapes(doc, [r1, r2], "UNION")!;
    expect(r.box.x).toBeCloseTo(1010 + 0, 0); // starts at the frame position + 10 (the rotated one reaches x = 1040)
    expect(r.box.x).toBeGreaterThanOrEqual(1000);
  });

  it("refuses layers it cannot outline", () => {
    const { doc, page, a } = setup();
    const text = doc.createNode("TEXT", { parentId: page });
    expect(booleanShapes(doc, [a, text], "UNION")).toBeNull();
    expect(booleanShapes(doc, [a], "UNION")).toBeNull();
  });

  it("outlines pen paths and polygons", () => {
    const { doc, page, a } = setup();
    const tri = doc.createNode("VECTOR", { parentId: page, props: { x: 0, y: 0, width: 100, height: 100, viewBox: "0 0 100 100", markup: '<polygon points="50,0 100,100 0,100"/>', fills: [], strokes: [] } });
    const r = booleanShapes(doc, [a, tri], "INTERSECT")!;
    expect(r.box.width).toBeCloseTo(100);
    expect(r.rings[0]).toHaveLength(3);
  });
});
