import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { offsetSelection } from "./actions";

function setup() {
  const doc = new DesignDoc();
  const frame = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id, props: { width: 400, height: 400 } });
  const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 100, y: 100, width: 100, height: 60, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }] } });
  return { doc, frame, rect };
}

describe("offsetSelection", () => {
  it("grows a shape by the distance on every side, keeping its fill", () => {
    const { doc, frame, rect } = setup();
    const out = offsetSelection(doc, [rect], 10);
    expect(out.error).toBeUndefined();
    const v = doc.getNode(out.ids[0]!)!;
    expect(v.type).toBe("VECTOR");
    expect(v).toMatchObject({ x: 90, y: 90, width: 120, height: 80 });
    expect((v as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#ff0000");
    expect(doc.children(frame).map((c) => c.id)).toEqual([v.id]);
  });

  it("shrinks with a negative distance and refuses a shape that vanishes", () => {
    const { doc, rect } = setup();
    const out = offsetSelection(doc, [rect], -10);
    expect(doc.getNode(out.ids[0]!)).toMatchObject({ x: 110, y: 110, width: 80, height: 40 });
    const small = setup();
    expect(offsetSelection(small.doc, [small.rect], -40).error).toBeTruthy();
  });

  it("rejects 0 and text, and undoes in one step", () => {
    const { doc, frame, rect } = setup();
    expect(offsetSelection(doc, [rect], 0).error).toBeTruthy();
    expect(offsetSelection(doc, [doc.createNode("TEXT", { parentId: frame })], 5).error).toBeTruthy();
    doc.stopCapturing();
    offsetSelection(doc, [rect], 5);
    doc.undo();
    expect(doc.hasNode(rect)).toBe(true);
  });
});
