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

describe("boolean operations with ellipse arcs", () => {
  it("a pie is the part of the circle it covers, not the whole circle", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const pie = doc.createNode("ELLIPSE", { parentId: page, props: { x: 0, y: 0, width: 100, height: 100, arcSweep: 90 } as never });
    const other = doc.createNode("RECTANGLE", { parentId: page, props: { x: 200, y: 0, width: 10, height: 10 } });
    const r = booleanShapes(doc, [pie, other], "UNION")!;
    // the quarter from 3 o'clock to 6 o'clock sits in the lower right corner of its box
    const pieRing = r.rings.find((ring) => ring.some(([x]) => x < 100));
    expect(pieRing).toBeTruthy();
    const xs = pieRing!.map((p) => p[0]);
    const ys = pieRing!.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(50, 0);
    expect(Math.min(...ys)).toBeCloseTo(50, 0);
    expect(Math.max(...xs)).toBeCloseTo(100, 0);
    expect(Math.max(...ys)).toBeCloseTo(100, 0);
  });

  it("subtracting a ring's hole leaves the ring: intersecting a ring with a square in its middle is empty", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const ring = doc.createNode("ELLIPSE", { parentId: page, props: { x: 0, y: 0, width: 100, height: 100, arcRatio: 0.5 } as never });
    const hole = doc.createNode("RECTANGLE", { parentId: page, props: { x: 40, y: 40, width: 20, height: 20 } });
    expect(booleanShapes(doc, [ring, hole], "INTERSECT")).toBeNull();
  });

  it("a plain ellipse still flattens to the full outline", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const e = doc.createNode("ELLIPSE", { parentId: page, props: { x: 0, y: 0, width: 100, height: 100 } });
    const o = doc.createNode("RECTANGLE", { parentId: page, props: { x: 200, y: 0, width: 10, height: 10 } });
    const r = booleanShapes(doc, [e, o], "UNION")!;
    expect(r.box.width).toBe(210);
  });
});
