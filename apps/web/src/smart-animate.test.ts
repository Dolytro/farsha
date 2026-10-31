import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { easeInOut, frameAt, matchLayers, scratchCopy } from "./smart-animate";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 300, height: 200 } });
  const b = doc.createNode("FRAME", { parentId: page, props: { x: 400, y: 0, width: 300, height: 200 } });
  const dotA = doc.createNode("RECTANGLE", { parentId: a, props: { name: "Dot", x: 10, y: 10, width: 20, height: 20 } });
  const dotB = doc.createNode("RECTANGLE", { parentId: b, props: { name: "Dot", x: 110, y: 50, width: 40, height: 20, opacity: 0.5 } });
  doc.createNode("RECTANGLE", { parentId: a, props: { name: "OnlyHere", x: 0, y: 0, width: 5, height: 5 } });
  doc.createNode("RECTANGLE", { parentId: b, props: { name: "Same", x: 0, y: 0, width: 5, height: 5 } });
  doc.createNode("RECTANGLE", { parentId: a, props: { name: "Same", x: 0, y: 0, width: 5, height: 5 } });
  return { doc, a, b, dotA, dotB };
}

describe("smart animate", () => {
  it("pairs layers with the same name and type, and skips layers that do not move", () => {
    const { doc, a, b, dotB } = setup();
    const pairs = matchLayers(doc, a, b);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ toId: dotB, from: { x: 10, y: 10, width: 20, height: 20, opacity: 1 }, to: { x: 110, y: 50, width: 40, height: 20, opacity: 0.5 } });
  });

  it("eases between 0 and 1", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
  });

  it("draws the destination with paired layers part-way, on a scratch copy only", () => {
    const { doc, a, b, dotB } = setup();
    const pairs = matchLayers(doc, a, b);
    const scratch = scratchCopy(doc);
    const mid = frameAt(scratch, b, pairs, 0.5)!;
    expect(mid.width).toBe(300);
    expect(scratch.getNode(dotB)).toMatchObject({ x: 60, y: 30, width: 30, opacity: 0.75 });
    expect(doc.getNode(dotB)).toMatchObject({ x: 110, y: 50 });
    frameAt(scratch, b, pairs, 1);
    expect(scratch.getNode(dotB)).toMatchObject({ x: 110, y: 50, width: 40, opacity: 0.5 });
    frameAt(scratch, b, pairs, 0);
    expect(scratch.getNode(dotB)).toMatchObject({ x: 10, y: 10, width: 20, opacity: 1 });
  });
});
