import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { penGeometry } from "@canvylo/canvas-engine";
import { joinSelection, simplifySelection, smoothSelection } from "./vector-actions";

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
