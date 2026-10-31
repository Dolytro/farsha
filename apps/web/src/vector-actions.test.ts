import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { penGeometry } from "@farsha/canvas-engine";
import { deletePointAndHeal, joinSelection, simplifySelection, smoothSelection, splitVectorAt } from "./vector-actions";

const c = (x: number, y: number) => ({ x, y, hx: 0, hy: 0 });

function path(doc: DesignDoc, parentId: string, x: number, y: number, pts: ReturnType<typeof c>[], closed = false) {
  const geo = penGeometry(pts, closed)!;
  return doc.createNode("VECTOR", {
    parentId,
    props: { x: x + geo.box.x, y: y + geo.box.y, width: geo.box.width, height: geo.box.height, viewBox: geo.viewBox, markup: geo.markup, penPoints: pts.map((p) => ({ ...p, x: p.x - geo.box.x, y: p.y - geo.box.y })), penClosed: closed, fills: [], strokes: [], strokeWidth: 1 } as never,
  });
}
const pts = (doc: DesignDoc, id: string) => (doc.getNode(id) as unknown as { penPoints: unknown[]; penClosed: boolean });

describe("vector actions", () => {
  it("simplify removes points on a straight line, as one undo step", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = path(doc, page, 0, 0, Array.from({ length: 10 }, (_, i) => c(i * 10, i % 2 === 0 ? 0 : 0.2)));
    doc.stopCapturing();
    expect(simplifySelection(doc, [id]).count).toBe(1);
    expect(pts(doc, id).penPoints).toHaveLength(2);
    doc.undo();
    expect(pts(doc, id).penPoints).toHaveLength(10);
    expect(simplifySelection(doc, [id]).count).toBe(1);
    expect(simplifySelection(doc, [id]).error).toBeTruthy();
  });

  it("smooth join gives middle points handles", () => {
    const doc = new DesignDoc();
    const id = path(doc, doc.pages()[0]!.id, 0, 0, [c(0, 0), c(10, 20), c(20, 0)]);
    smoothSelection(doc, [id]);
    expect((pts(doc, id).penPoints[1] as { hx: number }).hx).not.toBe(0);
  });

  it("join closes one open path and merges two", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = path(doc, page, 0, 0, [c(0, 0), c(10, 0), c(10, 10)]);
    expect(joinSelection(doc, [a]).error).toBeUndefined();
    expect(pts(doc, a).penClosed).toBe(true);
    const b = path(doc, page, 0, 100, [c(0, 0), c(10, 0)]);
    const d = path(doc, page, 10, 100, [c(0, 0), c(10, 0)]);
    const out = joinSelection(doc, [b, d]);
    expect(out.ids).toEqual([b]);
    expect(doc.hasNode(d)).toBe(false);
    expect(pts(doc, b).penPoints).toHaveLength(3);
    expect(doc.getNode(b)).toMatchObject({ width: 20 });
  });

  it("explains when nothing usable is selected", () => {
    const doc = new DesignDoc();
    const r = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id });
    expect(simplifySelection(doc, [r]).error).toBeTruthy();
    expect(joinSelection(doc, [r]).error).toBeTruthy();
  });
});

describe("point actions", () => {
  it("delete and heal removes one point and keeps the path joined", () => {
    const doc = new DesignDoc();
    const id = path(doc, doc.pages()[0]!.id, 0, 0, [c(0, 0), c(10, 5), c(20, 0), c(30, 5)]);
    expect(deletePointAndHeal(doc, id, 1)).toBe(true);
    expect(pts(doc, id).penPoints).toHaveLength(3);
    expect(deletePointAndHeal(doc, id, 9)).toBe(false);
    const two = path(doc, doc.pages()[0]!.id, 0, 100, [c(0, 0), c(10, 0)]);
    expect(deletePointAndHeal(doc, two, 0)).toBe(false);
  });

  it("split vector cuts an open path into two layers", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = path(doc, page, 0, 0, [c(0, 0), c(10, 0), c(20, 10), c(30, 10)]);
    doc.stopCapturing();
    const out = splitVectorAt(doc, id, 1)!;
    expect(out).toHaveLength(2);
    expect(pts(doc, out[0]!).penPoints).toHaveLength(2);
    expect(pts(doc, out[1]!).penPoints).toHaveLength(3);
    expect(doc.getNode(out[1]!)).toMatchObject({ x: 10, width: 20 });
    expect(splitVectorAt(doc, id, 0)).toBeNull();
    doc.undo();
    expect(pts(doc, id).penPoints).toHaveLength(4);
    expect(doc.children(page)).toHaveLength(1);
  });
});
