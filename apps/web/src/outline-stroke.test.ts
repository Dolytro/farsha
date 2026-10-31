import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { outlineStrokeSelection } from "./actions";

const red = [{ type: "SOLID" as const, color: "#ff0000", opacity: 1 }];

function setup(strokeAlign: "INSIDE" | "CENTER" | "OUTSIDE" = "CENTER") {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 300, height: 300 } });
  const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 50, y: 50, width: 100, height: 60, strokes: red, strokeWidth: 10, strokeAlign, fills: [] } });
  return { doc, frame, rect };
}

describe("outlineStrokeSelection", () => {
  it("turns a centred stroke into a filled vector around the edge and removes the stroke", () => {
    const { doc, frame, rect } = setup();
    const out = outlineStrokeSelection(doc, [rect]);
    expect(out.error).toBeUndefined();
    const v = doc.getNode(out.ids[0]!)!;
    expect(v.type).toBe("VECTOR");
    expect(v).toMatchObject({ x: 45, y: 45, width: 110, height: 70 });
    expect((v as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#ff0000");
    expect((doc.getNode(rect) as unknown as { strokes: unknown[] }).strokes).toEqual([]);
    expect(doc.children(frame).map((c) => c.id)).toEqual([rect, v.id]);
  });

  it("keeps an inside stroke inside and an outside stroke outside the shape", () => {
    const inside = setup("INSIDE");
    const vi = inside.doc.getNode(outlineStrokeSelection(inside.doc, [inside.rect]).ids[0]!)!;
    expect(vi).toMatchObject({ x: 50, y: 50, width: 100, height: 60 });
    const outside = setup("OUTSIDE");
    const vo = outside.doc.getNode(outlineStrokeSelection(outside.doc, [outside.rect]).ids[0]!)!;
    expect(vo).toMatchObject({ x: 40, y: 40, width: 120, height: 80 });
  });

  it("refuses layers without a stroke, and undoes in one step", () => {
    const { doc, frame, rect } = setup();
    doc.setStyle(rect, { strokes: [] });
    expect(outlineStrokeSelection(doc, [rect]).error).toBeTruthy();
    doc.setStyle(rect, { strokes: red });
    doc.stopCapturing();
    outlineStrokeSelection(doc, [rect]);
    doc.undo();
    expect(doc.children(frame)).toHaveLength(1);
    expect((doc.getNode(rect) as unknown as { strokes: unknown[] }).strokes).toHaveLength(1);
  });
});
