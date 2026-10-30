import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { distributeEdges, packLayers, roundToPixel, tidyUp } from "./arrange-actions";

function boxes(specs: [number, number, number, number][]) {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const ids = specs.map(([x, y, width, height]) => doc.createNode("RECTANGLE", { parentId: page, props: { x, y, width, height } }));
  return { doc, ids };
}
const at = (doc: DesignDoc, id: string) => [doc.getNode(id)!.x, doc.getNode(id)!.y];

describe("distributeEdges", () => {
  it("spaces left edges evenly between the outermost layers", () => {
    const { doc, ids } = boxes([[0, 0, 10, 10], [15, 0, 30, 10], [100, 0, 10, 10]]);
    expect(distributeEdges(doc, ids, "left")).toBe(3);
    expect(at(doc, ids[1]!)).toEqual([50, 0]);
  });

  it("spaces centres and bottoms", () => {
    const { doc, ids } = boxes([[0, 0, 10, 10], [0, 12, 10, 40], [0, 100, 10, 10]]);
    distributeEdges(doc, ids, "vcenter");
    // centres 5, ?, 105 -> middle centre 55 -> y = 55 - 20 = 35
    expect(doc.getNode(ids[1]!)!.y).toBe(35);
    distributeEdges(doc, ids, "bottom");
    expect(doc.getNode(ids[1]!)!.y + 40).toBeCloseTo(60);
  });

  it("needs three layers in one parent", () => {
    const { doc, ids } = boxes([[0, 0, 10, 10], [50, 0, 10, 10]]);
    expect(distributeEdges(doc, ids, "left")).toBe(0);
  });
});

describe("tidyUp", () => {
  it("puts messy layers into rows with the average gap", () => {
    // two rows: (0,0) and (30,3) are one row; (5,60) is a second row
    const { doc, ids } = boxes([[0, 0, 20, 20], [30, 3, 20, 20], [5, 60, 20, 20]]);
    expect(tidyUp(doc, ids)).toBe(3);
    // gap x = 10 (30 - 20); gap y = 60 - 23 = 37 -> rounded
    expect(at(doc, ids[0]!)).toEqual([0, 0]);
    expect(at(doc, ids[1]!)).toEqual([30, 0]);
    expect(at(doc, ids[2]!)).toEqual([0, 57]);
  });

  it("is one undo step", () => {
    const { doc, ids } = boxes([[0, 0, 20, 20], [33, 7, 20, 20]]);
    tidyUp(doc, ids);
    doc.undo();
    expect(at(doc, ids[1]!)).toEqual([33, 7]);
  });
});

describe("packLayers", () => {
  it("lines layers up touching each other", () => {
    const { doc, ids } = boxes([[10, 5, 20, 10], [100, 5, 30, 10], [50, 5, 10, 10]]);
    packLayers(doc, ids, "horizontal");
    expect(at(doc, ids[0]!)).toEqual([10, 5]);
    expect(at(doc, ids[2]!)).toEqual([30, 5]);
    expect(at(doc, ids[1]!)).toEqual([40, 5]);
  });

  it("packs vertically", () => {
    const { doc, ids } = boxes([[0, 0, 10, 10], [0, 50, 10, 20]]);
    packLayers(doc, ids, "vertical");
    expect(at(doc, ids[1]!)).toEqual([0, 10]);
  });
});

describe("roundToPixel", () => {
  it("rounds position and size, including children", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 10.4, y: 20.6, width: 100.5, height: 50.2, clipsContent: true } });
    const kid = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 1.5, y: 2.2, width: 10.7, height: 3.3 } });
    expect(roundToPixel(doc, [frame])).toBeGreaterThan(0);
    expect(doc.getNode(frame)).toMatchObject({ x: 10, y: 21, width: 101, height: 50 });
    const k = doc.getNode(kid)!;
    expect([k.x, k.y]).toEqual([2, 2]);
    expect(Number.isInteger(k.width) && Number.isInteger(k.height)).toBe(true);
  });

  it("does nothing for layers that are already whole", () => {
    const { doc, ids } = boxes([[1, 2, 3, 4]]);
    expect(roundToPixel(doc, ids)).toBe(0);
  });
});
