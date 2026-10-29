import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { alignSelection, distributeSelection } from "./align";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 300, height: 200 } });
  const a = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 20, width: 40, height: 20 } });
  const b = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 100, y: 60, width: 60, height: 50 } });
  const c = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 250, y: 150, width: 30, height: 30 } });
  return { doc, page, frame, a, b, c };
}
const pos = (doc: DesignDoc, id: string) => {
  const n = doc.getNode(id)!;
  return [n.x, n.y];
};

describe("alignSelection", () => {
  it("aligns several layers to their shared bounds", () => {
    const { doc, a, b, c } = setup();
    alignSelection(doc, [a, b, c], "left");
    expect([a, b, c].map((id) => doc.getNode(id)!.x)).toEqual([10, 10, 10]);
    alignSelection(doc, [a, b, c], "bottom");
    expect([a, b, c].map((id) => doc.getNode(id)!.y + doc.getNode(id)!.height)).toEqual([180, 180, 180]);
  });

  it("centres on the shared bounds", () => {
    const { doc, a, b } = setup();
    alignSelection(doc, [a, b], "hcenter"); // bounds x 10..160, centre 85
    expect(doc.getNode(a)!.x + 20).toBe(85);
    expect(doc.getNode(b)!.x + 30).toBe(85);
  });

  it("aligns a single layer to its parent frame", () => {
    const { doc, a } = setup();
    alignSelection(doc, [a], "right");
    expect(doc.getNode(a)!.x).toBe(260);
    alignSelection(doc, [a], "vcenter");
    expect(doc.getNode(a)!.y).toBe(90);
  });

  it("does nothing for a lone layer directly on a page, and skips locked layers", () => {
    const { doc, page, a, b } = setup();
    const top = doc.createNode("RECTANGLE", { parentId: page, props: { x: 5, y: 5, width: 10, height: 10 } });
    expect(alignSelection(doc, [top], "right")).toBe(0);
    doc.setStyle(b, { locked: true });
    alignSelection(doc, [a, b], "right");
    expect(pos(doc, b)).toEqual([100, 60]);
  });
});

describe("distributeSelection", () => {
  it("evens out horizontal gaps and keeps the outer layers", () => {
    const { doc, a, b, c } = setup(); // x: 10..50, 100..160, 250..280
    expect(distributeSelection(doc, [a, b, c], "horizontal")).toBe(1);
    // free space = 270 - (40 + 60 + 30) = 140, gap 70 -> b starts at 50 + 70 = 120
    expect(doc.getNode(b)!.x).toBe(120);
    expect(doc.getNode(a)!.x).toBe(10);
    expect(doc.getNode(c)!.x).toBe(250);
  });

  it("needs at least three layers", () => {
    const { doc, a, b } = setup();
    expect(distributeSelection(doc, [a, b], "vertical")).toBe(0);
  });
});
