import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { booleanGroupVector, exportSvg } from "@farsha/canvas-engine";
import { booleanGroupSelection, flattenSelection } from "./actions";

const red = [{ type: "SOLID" as const, color: "#ff0000", opacity: 1 }];

function setup() {
  const doc = new DesignDoc();
  const frame = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id, props: { x: 0, y: 0, width: 400, height: 300 } });
  const a = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 100, height: 100, fills: red } });
  const b = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 60, y: 60, width: 100, height: 100 } });
  return { doc, frame, a, b };
}

describe("boolean groups", () => {
  it("groups the shapes, keeps them editable and takes the bottom fill", () => {
    const { doc, frame, a, b } = setup();
    const out = booleanGroupSelection(doc, [a, b], "UNION");
    expect(out.error).toBeUndefined();
    const g = doc.getNode(out.ids[0]!)!;
    expect(g).toMatchObject({ type: "GROUP", booleanOp: "UNION", name: "Union" });
    expect((g as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#ff0000");
    expect(doc.children(g.id).map((c) => c.id)).toEqual([a, b]);
    expect(doc.children(frame)).toHaveLength(1);
  });

  it("draws the combined outline and follows the children", () => {
    const { doc, a, b } = setup();
    const gid = booleanGroupSelection(doc, [a, b], "UNION").ids[0]!;
    const before = booleanGroupVector(doc, doc.getNode(gid)!)!;
    expect(before).toMatchObject({ width: 150, height: 150 });
    doc.setPosition(b, 200, 60);
    const after = booleanGroupVector(doc, doc.getNode(gid)!)!;
    expect(after.width).toBeGreaterThan(before.width);
    const svg = exportSvg(doc, [gid])!.svg;
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain("#ff0000");
  });

  it("subtract cuts the upper shape out of the lower", () => {
    const { doc, a, b } = setup();
    const gid = booleanGroupSelection(doc, [a, b], "SUBTRACT").ids[0]!;
    expect(booleanGroupVector(doc, doc.getNode(gid)!)).toMatchObject({ width: 100, height: 100 });
  });

  it("flatten turns a boolean group into one vector of the combined outline", () => {
    const { doc, frame, a, b } = setup();
    const gid = booleanGroupSelection(doc, [a, b], "UNION").ids[0]!;
    const out = flattenSelection(doc, [gid]);
    const v = doc.getNode(out.ids[0]!)!;
    expect(v.type).toBe("VECTOR");
    expect(v).toMatchObject({ width: 150, height: 150 });
    expect((v as unknown as { markup: string }).markup.match(/M/g)).toHaveLength(1);
    expect(doc.children(frame)).toHaveLength(1);
  });

  it("refuses text, one shape or shapes that do not overlap for Intersect", () => {
    const { doc, frame, a, b } = setup();
    expect(booleanGroupSelection(doc, [a], "UNION").error).toBeTruthy();
    expect(booleanGroupSelection(doc, [a, doc.createNode("TEXT", { parentId: frame })], "UNION").error).toBeTruthy();
    doc.setPosition(b, 300, 200);
    expect(booleanGroupSelection(doc, [a, b], "INTERSECT").error).toBeTruthy();
  });
});

describe("nearestFrame", () => {
  it("finds the frame a layer drawn on top of another layer belongs to", async () => {
    const { nearestFrame } = await import("./actions");
    const { doc, frame, a } = setup();
    expect(nearestFrame(doc, doc.getNode(a))?.id).toBe(frame);
    expect(nearestFrame(doc, doc.getNode(frame))?.id).toBe(frame);
    expect(nearestFrame(doc, undefined)).toBeUndefined();
    const loose = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id });
    expect(nearestFrame(doc, doc.getNode(loose))).toBeUndefined();
  });
});
