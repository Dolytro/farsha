import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { hitTest } from "./hit-test";
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
