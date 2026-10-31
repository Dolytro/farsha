import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { flattenSelection, groupSelection } from "./actions";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 400, height: 400 } });
  const a = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 50, height: 50, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }] } });
  const b = doc.createNode("ELLIPSE", { parentId: frame, props: { x: 100, y: 20, width: 40, height: 40 } });
  return { doc, page, frame, a, b };
}

describe("flattenSelection", () => {
  it("replaces several shapes with one vector covering them, keeping the bottom fill", () => {
    const { doc, frame, a, b } = setup();
    const out = flattenSelection(doc, [a, b]);
    expect(out.error).toBeUndefined();
    expect(doc.children(frame)).toHaveLength(1);
    const v = doc.getNode(out.ids[0]!)!;
    expect(v.type).toBe("VECTOR");
    expect(v).toMatchObject({ x: 10, y: 10, width: 130, height: 50 });
    expect((v as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#ff0000");
    expect((v as unknown as { markup: string }).markup.match(/M/g)).toHaveLength(2);
  });

  it("flattens one shape, and the shapes inside a group", () => {
    const { doc, frame, a, b } = setup();
    const group = groupSelection(doc, [a, b])[0]!;
    const out = flattenSelection(doc, [group]);
    expect(doc.getNode(out.ids[0]!)!.type).toBe("VECTOR");
    expect(doc.children(frame)).toHaveLength(1);
    const single = setup();
    expect(flattenSelection(single.doc, [single.a]).error).toBeUndefined();
  });

  it("undoes in one step and refuses text and mixed parents", () => {
    const { doc, frame, a, b } = setup();
    doc.stopCapturing();
    flattenSelection(doc, [a, b]);
    doc.undo();
    expect(doc.children(frame)).toHaveLength(2);
    const t = doc.createNode("TEXT", { parentId: frame, props: {} });
    expect(flattenSelection(doc, [t]).error).toBeTruthy();
    const other = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id });
    expect(flattenSelection(doc, [a, other]).error).toBeTruthy();
  });
});
