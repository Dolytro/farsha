import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { hitTest, hitTestAll } from "./hit-test";
import { zoomAt, screenToWorld } from "./viewport";

describe("hitTest", () => {
  it("returns the topmost node and respects nesting", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 200, height: 200 } });
    const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 50, height: 50 } });
    expect(hitTest(doc, page, 120, 120)?.id).toBe(rect);
    expect(hitTest(doc, page, 250, 250)?.id).toBe(frame);
    expect(hitTest(doc, page, 5, 5)).toBeUndefined();
  });

  it("picks the whole outermost group, and the inner layer with deep", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const outer = doc.createNode("GROUP", { parentId: page, props: { x: 0, y: 0, width: 200, height: 100 } });
    const inner = doc.createNode("GROUP", { parentId: outer, props: { x: 0, y: 0, width: 100, height: 100 } });
    const rect = doc.createNode("RECTANGLE", { parentId: inner, props: { x: 10, y: 10, width: 50, height: 50 } });
    const other = doc.createNode("RECTANGLE", { parentId: outer, props: { x: 120, y: 10, width: 50, height: 50 } });
    expect(hitTest(doc, page, 20, 20)?.id).toBe(outer);
    expect(hitTest(doc, page, 130, 20)?.id).toBe(outer);
    expect(hitTest(doc, page, 20, 20, true)?.id).toBe(rect);
    expect(hitTest(doc, page, 130, 20, true)?.id).toBe(other);
    expect(inner).not.toBe(outer);
  });

  it("skips hidden and locked nodes", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 50, height: 50, locked: true } });
    expect(hitTest(doc, page, 10, 10)).toBeUndefined();
    doc.setStyle(rect, { locked: false, visible: false });
    expect(hitTest(doc, page, 10, 10)).toBeUndefined();
  });
});

describe("viewport", () => {
  it("keeps the zoom anchor fixed", () => {
    const v = { x: 0, y: 0, zoom: 1 };
    const before = screenToWorld(v, 200, 100);
    const next = zoomAt(v, 200, 100, 2);
    const after = screenToWorld(next, 200, 100);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});

describe("hit test: thin and rotated layers", () => {
  it("can pick a zero-height line", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("VECTOR", { parentId: page, props: { x: 0, y: 50, width: 100, height: 0 } });
    expect(hitTest(doc, page, 50, 51)?.id).toBe(id);
    expect(hitTest(doc, page, 50, 60)).toBeUndefined();
  });
  it("follows rotation around the centre", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 100, height: 10, rotation: 90 } });
    // rotated 90 degrees about (50, 5): it now covers x 45..55, y -45..55
    expect(hitTest(doc, page, 50, 50)?.id).toBe(id);
    expect(hitTest(doc, page, 90, 5)).toBeUndefined();
  });
});

describe("first on top stacking", () => {
  it("an auto layout frame with first on top is hit on its first layer", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { layoutMode: "HORIZONTAL", width: 100, height: 100 } });
    const a = doc.createNode("RECTANGLE", { parentId: frame, props: { width: 10, height: 10, layoutPositioning: "ABSOLUTE" } });
    const b = doc.createNode("RECTANGLE", { parentId: frame, props: { width: 10, height: 10, layoutPositioning: "ABSOLUTE" } });
    expect(hitTest(doc, page, 5, 5, true)?.id).toBe(b);
    doc.setStyle(frame, { layoutFirstOnTop: true });
    expect(hitTest(doc, page, 5, 5, true)?.id).toBe(a);
  });
});

describe("hitTestAll", () => {
  it("lists every layer under the point, topmost first", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 200, height: 200 } });
    const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 50, height: 50 } });
    const behind = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 400, height: 400 } });
    doc.reorderNode(behind, 0);
    expect(hitTestAll(doc, page, 120, 120).map((n) => n.id)).toEqual([rect, frame, behind]);
    expect(hitTestAll(doc, page, 250, 250).map((n) => n.id)).toEqual([frame, behind]);
    expect(hitTestAll(doc, page, 900, 900)).toEqual([]);
  });
  it("skips hidden and locked layers", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 50, height: 50 } });
    const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 50, height: 50, visible: false } });
    const c = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 50, height: 50, locked: true } });
    expect(hitTestAll(doc, page, 10, 10).map((n) => n.id)).toEqual([a]);
    expect([b, c]).toHaveLength(2);
  });
});
