import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { groupSelection, adjacentFrame, useAsMask, flipSelection, frameSelection, toggleHidden, toggleLocked } from "./actions";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 0, y: 0, width: 10, height: 10 } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 20, y: 0, width: 10, height: 10 } });
  return { doc, a, b };
}

describe("toggleLocked / toggleHidden", () => {
  it("locks all when any is unlocked, then unlocks all", () => {
    const { doc, a, b } = setup();
    doc.setStyle(a, { locked: true });
    toggleLocked(doc, [a, b]);
    expect([doc.getNode(a)!.locked, doc.getNode(b)!.locked]).toEqual([true, true]);
    toggleLocked(doc, [a, b]);
    expect([doc.getNode(a)!.locked, doc.getNode(b)!.locked]).toEqual([false, false]);
  });
  it("hides then shows", () => {
    const { doc, a } = setup();
    toggleHidden(doc, [a]);
    expect(doc.getNode(a)!.visible).toBe(false);
    toggleHidden(doc, [a]);
    expect(doc.getNode(a)!.visible).toBe(true);
  });
});

describe("flipSelection", () => {
  it("toggles the flip flags per layer", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id });
    flipSelection(doc, [id], "x");
    expect(doc.getNode(id)).toMatchObject({ flipX: true });
    flipSelection(doc, [id], "y");
    expect(doc.getNode(id)).toMatchObject({ flipX: true, flipY: true });
    flipSelection(doc, [id], "x");
    expect(doc.getNode(id)!.flipX).toBe(false);
  });
});

describe("frameSelection", () => {
  it("wraps the layers in a frame sized to their bounds, keeping their look", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 50, y: 60, width: 20, height: 20 } });
    const b = doc.createNode("ELLIPSE", { parentId: page, props: { x: 100, y: 90, width: 30, height: 30 } });
    const [frame] = frameSelection(doc, [a, b]);
    expect(doc.getNode(frame!)).toMatchObject({ type: "FRAME", x: 50, y: 60, width: 80, height: 60, parentId: page });
    expect(doc.getNode(a)).toMatchObject({ parentId: frame, x: 0, y: 0 });
    expect(doc.getNode(b)).toMatchObject({ parentId: frame, x: 50, y: 30 });
    expect(doc.children(frame!).map((n) => n.id)).toEqual([a, b]);
  });

  it("does nothing for layers with different parents", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const f = doc.createNode("FRAME", { parentId: page });
    const a = doc.createNode("RECTANGLE", { parentId: page });
    const b = doc.createNode("RECTANGLE", { parentId: f });
    expect(frameSelection(doc, [a, b])).toEqual([a, b]);
  });
});

describe("adjacentFrame", () => {
  it("walks the top-level frames in reading order and wraps", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const b = doc.createNode("FRAME", { parentId: page, props: { x: 500, y: 0 } });
    const a = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0 } });
    const c = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 900 } });
    doc.createNode("RECTANGLE", { parentId: page });
    expect(adjacentFrame(doc, page, undefined, 1)).toBe(a);
    expect(adjacentFrame(doc, page, a, 1)).toBe(b);
    expect(adjacentFrame(doc, page, b, 1)).toBe(c);
    expect(adjacentFrame(doc, page, c, 1)).toBe(a);
    expect(adjacentFrame(doc, page, a, -1)).toBe(c);
    expect(adjacentFrame(doc, page, undefined, -1)).toBe(c);
  });

  it("starts from the frame that contains the selected layer", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0 } });
    const b = doc.createNode("FRAME", { parentId: page, props: { x: 500, y: 0 } });
    const inner = doc.createNode("RECTANGLE", { parentId: a });
    expect(adjacentFrame(doc, page, inner, 1)).toBe(b);
  });

  it("is undefined without frames", () => {
    const doc = new DesignDoc();
    expect(adjacentFrame(doc, doc.pages()[0]!.id, undefined, 1)).toBeUndefined();
  });
});

describe("useAsMask", () => {
  it("toggles a single layer as mask", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("ELLIPSE", { parentId: doc.pages()[0]!.id });
    useAsMask(doc, [id]);
    expect(doc.getNode(id)!.isMask).toBe(true);
    useAsMask(doc, [id]);
    expect(doc.getNode(id)!.isMask).toBe(false);
  });

  it("groups several layers and makes the bottom one the mask", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const shape = doc.createNode("ELLIPSE", { parentId: page, props: { x: 0, y: 0, width: 50, height: 50 } });
    const photo = doc.createNode("RECTANGLE", { parentId: page, props: { x: 10, y: 10, width: 80, height: 80 } });
    const [group] = useAsMask(doc, [shape, photo]);
    expect(doc.getNode(group!)!.type).toBe("GROUP");
    expect(doc.getNode(shape)!.isMask).toBe(true);
    expect(doc.getNode(photo)!.isMask).toBeFalsy();
  });
});

describe("groupSelection order", () => {
  it("keeps the stacking order, not the selection order", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const bottom = doc.createNode("RECTANGLE", { parentId: page });
    const top = doc.createNode("RECTANGLE", { parentId: page });
    const [group] = groupSelection(doc, [top, bottom]);
    expect(doc.children(group!).map((n) => n.id)).toEqual([bottom, top]);
  });
});
