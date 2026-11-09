import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { commonValue, selectionFrame, setCommonStyle, setSelectionBox } from "./multi-edit";

function scene() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 20, height: 10, opacity: 0.5, cornerRadius: 4 } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 80, y: 40, width: 20, height: 10, opacity: 0.5, cornerRadius: 8 } });
  return { doc, page, a, b };
}

describe("commonValue", () => {
  it("is the shared value, or null when they differ or there are none", () => {
    expect(commonValue([1, 1, 1])).toBe(1);
    expect(commonValue(["a", "b"])).toBeNull();
    expect(commonValue([])).toBeNull();
    expect(commonValue([0, 0])).toBe(0);
  });
});

describe("selectionFrame", () => {
  it("is the box round the layers, in their parent's coordinates when they share one", () => {
    const { doc, a, b } = scene();
    expect(selectionFrame(doc, [a, b])).toEqual({ box: { x: 0, y: 0, width: 100, height: 50 }, sameParent: true });
  });
  it("is on the canvas for layers in different parents, and missing for fewer than two", () => {
    const { doc, page, a, b } = scene();
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 300, y: 300, width: 100, height: 100 } });
    const inside = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 20, height: 20 } });
    expect(selectionFrame(doc, [a, inside])).toEqual({ box: { x: 0, y: 0, width: 330, height: 330 }, sameParent: false });
    expect(selectionFrame(doc, [a])).toBeNull();
    expect(b).toBeTruthy();
  });
});

describe("setSelectionBox", () => {
  it("moves the layers together", () => {
    const { doc, a, b } = scene();
    setSelectionBox(doc, [a, b], { x: 50, y: 60 });
    expect(doc.getNode(a)).toMatchObject({ x: 50, y: 60 });
    expect(doc.getNode(b)).toMatchObject({ x: 130, y: 100 });
  });
  it("scales the layers together when the size changes, keeping their place in the box", () => {
    const { doc, a, b } = scene();
    setSelectionBox(doc, [a, b], { width: 200, height: 100 });
    expect(doc.getNode(a)).toMatchObject({ x: 0, y: 0, width: 40, height: 20 });
    expect(doc.getNode(b)).toMatchObject({ x: 160, y: 80, width: 40, height: 20 });
  });
  it("moves layers of different parents together on the canvas, and skips locked layers", () => {
    const { doc, page, a } = scene();
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 300, y: 300, width: 100, height: 100 } });
    const inside = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 20, height: 20 } });
    setSelectionBox(doc, [a, inside], { x: 10 });
    expect(doc.absoluteBox(a)).toMatchObject({ x: 10 });
    expect(doc.absoluteBox(inside)).toMatchObject({ x: 320 });
    doc.setStyle(a, { locked: true });
    const done = setSelectionBox(doc, [a, inside], { y: 0 });
    expect(done).toEqual([inside]);
  });
  it("is one undo step", () => {
    const { doc, a, b } = scene();
    setSelectionBox(doc, [a, b], { width: 200 });
    doc.undo();
    expect(doc.getNode(b)).toMatchObject({ x: 80, width: 20 });
  });
});

describe("setCommonStyle", () => {
  it("sets a value on every layer that has the property", () => {
    const { doc, page, a, b } = scene();
    const text = doc.createNode("TEXT", { parentId: page, props: { characters: "hi" } });
    const done = setCommonStyle(doc, [a, b, text], "cornerRadius", 12);
    expect(done.sort()).toEqual([a, b].sort());
    expect(doc.getNode(a)).toMatchObject({ cornerRadius: 12 });
    expect(doc.getNode(b)).toMatchObject({ cornerRadius: 12 });
    setCommonStyle(doc, [a, b, text], "opacity", 0.25);
    expect(doc.getNode(text)).toMatchObject({ opacity: 0.25 });
  });
});
