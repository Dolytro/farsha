import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { hideOtherLayers, removeInteractions, removePaint, rotateSelectionBy, setOpacityFromKey, swapFillAndStroke } from "./object-actions";

const red = [{ type: "SOLID" as const, color: "#ff0000", opacity: 1 }];
const blue = [{ type: "SOLID" as const, color: "#0000ff", opacity: 1 }];

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 100, height: 20, fills: red, strokes: blue } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 100, y: 0, width: 100, height: 20 } });
  return { doc, page, a, b };
}

describe("rotateSelectionBy", () => {
  it("turns a single layer around its own centre", () => {
    const { doc, a } = setup();
    expect(rotateSelectionBy(doc, [a], 90)).toBe(1);
    expect(doc.getNode(a)).toMatchObject({ rotation: 90, x: 0, y: 0 });
  });

  it("turns several layers around the middle of the selection", () => {
    const { doc, a, b } = setup();
    rotateSelectionBy(doc, [a, b], 90);
    // the pair is 200 x 20 centred at (100, 10); after a quarter turn a sits above b around x = 100
    expect(doc.getNode(a)).toMatchObject({ rotation: 90 });
    expect(doc.getNode(a)!.y).toBeLessThan(doc.getNode(b)!.y);
    expect(doc.getNode(a)!.x + 50).toBeCloseTo(100);
    expect(doc.getNode(b)!.x + 50).toBeCloseTo(100);
  });

  it("is one undo step and accumulates", () => {
    const { doc, a } = setup();
    rotateSelectionBy(doc, [a], 90);
    rotateSelectionBy(doc, [a], 90);
    expect(doc.getNode(a)!.rotation).toBe(180);
    doc.undo();
    expect(doc.getNode(a)!.rotation).toBe(90);
  });
});

describe("paint actions", () => {
  it("removes fills or strokes", () => {
    const { doc, a, b } = setup();
    expect(removePaint(doc, [a, b], "fills")).toBe(2);
    expect((doc.getNode(a) as unknown as { fills: unknown[] }).fills).toEqual([]);
    expect(removePaint(doc, [a, b], "strokes")).toBe(1);
  });

  it("swaps fill and stroke", () => {
    const { doc, a } = setup();
    expect(swapFillAndStroke(doc, [a])).toBe(1);
    const n = doc.getNode(a) as unknown as { fills: { color: string }[]; strokes: { color: string }[] };
    expect(n.fills[0]!.color).toBe("#0000ff");
    expect(n.strokes[0]!.color).toBe("#ff0000");
  });
});

describe("hideOtherLayers", () => {
  it("hides everything else, then shows it again", () => {
    const { doc, page, a, b } = setup();
    const frame = doc.createNode("FRAME", { parentId: page });
    const inside = doc.createNode("RECTANGLE", { parentId: frame });
    expect(hideOtherLayers(doc, [inside], page)).toBe(true);
    expect(doc.getNode(a)!.visible).toBe(false);
    expect(doc.getNode(b)!.visible).toBe(false);
    expect(doc.getNode(frame)!.visible).toBe(true); // contains the selection
    expect(doc.getNode(inside)!.visible).toBe(true);
    expect(hideOtherLayers(doc, [inside], page)).toBe(false);
    expect(doc.getNode(a)!.visible).toBe(true);
  });
});

describe("remove interactions and opacity keys", () => {
  it("clears interactions", () => {
    const { doc, a, b } = setup();
    doc.setStyle(a, { interactions: [{ trigger: "ON_CLICK", action: { type: "BACK" } }] });
    expect(removeInteractions(doc, [a, b])).toBe(1);
    expect(doc.getNode(a)!.interactions).toEqual([]);
  });

  it("maps digits to opacity", () => {
    const { doc, a } = setup();
    setOpacityFromKey(doc, [a], "3");
    expect(doc.getNode(a)!.opacity).toBeCloseTo(0.3);
    setOpacityFromKey(doc, [a], "0");
    expect(doc.getNode(a)!.opacity).toBe(1);
    expect(setOpacityFromKey(doc, [a], "x")).toBe(0);
  });
});

describe("deleteContents", () => {
  it("empties frames and groups but keeps them, in one undo step", async () => {
    const { DesignDoc } = await import("@farsha/design-core");
    const { deleteContents } = await import("./object-actions");
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page });
    doc.createNode("RECTANGLE", { parentId: frame });
    doc.createNode("TEXT", { parentId: frame });
    const rect = doc.createNode("RECTANGLE", { parentId: page });
    doc.stopCapturing();
    expect(deleteContents(doc, [frame, rect])).toBe(2);
    expect(doc.children(frame)).toHaveLength(0);
    expect(doc.hasNode(frame)).toBe(true);
    expect(doc.hasNode(rect)).toBe(true);
    expect(deleteContents(doc, [frame])).toBe(0);
    doc.undo();
    expect(doc.children(frame)).toHaveLength(2);
  });
});
