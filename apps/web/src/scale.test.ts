import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { buildScaleUpdates } from "./scale";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 50, width: 200, height: 100, cornerRadius: 8, strokeWidth: 2 } });
  const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 20, y: 10, width: 60, height: 40, cornerRadius: 4, strokeWidth: 1 } });
  const text = doc.createNode("TEXT", { parentId: frame, props: { x: 10, y: 60, width: 100, height: 24, fontSize: 16, letterSpacing: 1, lineHeight: 20 } });
  doc.setStyle(rect, { effects: [{ type: "DROP_SHADOW", x: 2, y: 4, blur: 6, color: "#000000", opacity: 0.2, visible: true }, { type: "LAYER_BLUR", radius: 4, visible: true }] });
  const nodes = [doc.getNode(frame)!, doc.getNode(rect)!, doc.getNode(text)!];
  return { doc, frame, rect, text, nodes };
}

describe("buildScaleUpdates", () => {
  it("scales the layer to the target box and its contents by the same factor", () => {
    const { frame, rect, text, nodes } = setup();
    const out = buildScaleUpdates(nodes, { x: 150, y: 60, width: 400, height: 200 });
    expect(out[frame]).toMatchObject({ x: 150, y: 60, width: 400, height: 200, cornerRadius: 16, strokeWidth: 4 });
    expect(out[rect]).toMatchObject({ x: 40, y: 20, width: 120, height: 80, cornerRadius: 8, strokeWidth: 2 });
    expect(out[text]).toMatchObject({ x: 20, y: 120, width: 200, height: 48, fontSize: 32, letterSpacing: 2, lineHeight: 40 });
  });

  it("scales shadows and blur", () => {
    const { rect, nodes } = setup();
    const out = buildScaleUpdates(nodes, { x: 100, y: 50, width: 100, height: 50 });
    const effects = out[rect]!.effects as { type: string; x?: number; y?: number; blur?: number; radius?: number }[];
    expect(effects[0]).toMatchObject({ x: 1, y: 2, blur: 3 });
    expect(effects[1]).toMatchObject({ radius: 2 });
  });

  it("keeps the height in proportion even if the target box was not", () => {
    const { frame, nodes } = setup();
    const out = buildScaleUpdates(nodes, { x: 0, y: 0, width: 100, height: 999 });
    expect(out[frame]!.height).toBe(50);
  });

  it("never makes text smaller than 1px and copes with an empty list", () => {
    const { text, nodes } = setup();
    const out = buildScaleUpdates(nodes, { x: 0, y: 0, width: 1, height: 1 });
    expect(out[text]!.fontSize).toBeGreaterThanOrEqual(1);
    expect(buildScaleUpdates([], { x: 0, y: 0, width: 1, height: 1 })).toEqual({});
  });

  it("is applied in one undo step through patchNodes", () => {
    const { doc, frame, rect, nodes } = setup();
    doc.stopCapturing();
    doc.patchNodes(buildScaleUpdates(nodes, { x: 100, y: 50, width: 400, height: 200 }));
    expect(doc.getNode(frame)).toMatchObject({ width: 400, height: 200 });
    expect(doc.getNode(rect)).toMatchObject({ width: 120, height: 80 });
    doc.undo();
    expect(doc.getNode(frame)).toMatchObject({ width: 200, height: 100 });
    expect(doc.getNode(rect)).toMatchObject({ width: 60, height: 40 });
  });
});
