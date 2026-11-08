import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { dropInto, dropParent } from "./reparent-drop";

function scene() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("FRAME", { parentId: page, props: { name: "A", x: 0, y: 0, width: 200, height: 200 } });
  const inner = doc.createNode("FRAME", { parentId: a, props: { name: "Inner", x: 20, y: 20, width: 100, height: 100 } });
  const b = doc.createNode("FRAME", { parentId: page, props: { name: "B", x: 400, y: 0, width: 200, height: 200 } });
  const loose = doc.createNode("RECTANGLE", { parentId: page, props: { name: "Loose", x: 250, y: 50, width: 40, height: 40 } });
  return { doc, page, a, inner, b, loose };
}

describe("dropParent", () => {
  it("is the deepest frame under the pointer", () => {
    const { doc, page, a, inner } = scene();
    expect(dropParent(doc, page, [], { x: 50, y: 50 })).toBe(inner);
    expect(dropParent(doc, page, [], { x: 180, y: 180 })).toBe(a);
  });
  it("is the page over empty canvas", () => {
    const { doc, page } = scene();
    expect(dropParent(doc, page, [], { x: 300, y: 300 })).toBe(page);
  });
  it("never a dragged layer or something inside it", () => {
    const { doc, page, a } = scene();
    expect(dropParent(doc, page, [a], { x: 50, y: 50 })).toBe(page);
  });
});

describe("dropInto", () => {
  it("moves a loose layer into the frame it is dropped on, keeping its place on the canvas", () => {
    const { doc, page, b, loose } = scene();
    expect(doc.getNode(loose)!.parentId).toBe(page);
    const moved = dropInto(doc, page, [loose], { x: 450, y: 60 });
    expect(moved).toEqual([loose]);
    expect(doc.getNode(loose)!.parentId).toBe(b);
    expect(doc.absoluteBox(loose)).toMatchObject({ x: 250, y: 50 });
    expect(doc.getNode(loose)).toMatchObject({ x: -150, y: 50 });
  });

  it("moves a layer out of a frame onto the page when it is dropped on empty canvas", () => {
    const { doc, page, inner } = scene();
    const child = doc.createNode("RECTANGLE", { parentId: inner, props: { x: 10, y: 10, width: 20, height: 20 } });
    const before = doc.absoluteBox(child)!;
    expect(dropInto(doc, page, [child], { x: 300, y: 300 })).toEqual([child]);
    expect(doc.getNode(child)!.parentId).toBe(page);
    expect(doc.absoluteBox(child)).toMatchObject({ x: before.x, y: before.y });
  });

  it("leaves a layer alone that is dropped inside its own parent, and layers inside instances", () => {
    const { doc, page, a, inner } = scene();
    expect(dropInto(doc, page, [inner], { x: 150, y: 150 })).toEqual([]);
    expect(doc.getNode(inner)!.parentId).toBe(a);
    const main = doc.createComponent([doc.createNode("FRAME", { parentId: page, props: { width: 50, height: 50, x: 300, y: 300 } })]);
    const text = doc.createNode("TEXT", { parentId: main, props: { characters: "x" } });
    const instance = doc.createInstance(main, page, 500, 300);
    const inInstance = doc.children(instance)[0]!;
    expect(inInstance).toBeTruthy();
    expect(dropInto(doc, page, [inInstance.id], { x: 50, y: 50 })).toEqual([]);
    expect(text).toBeTruthy();
  });

  it("into an auto layout frame the layer takes the slot under the pointer", () => {
    const { doc, page, loose } = scene();
    const row = doc.createNode("FRAME", { parentId: page, props: { name: "Row", x: 0, y: 400, width: 300, height: 60, layoutMode: "HORIZONTAL", itemSpacing: 10 } as never });
    const x = doc.createNode("RECTANGLE", { parentId: row, props: { width: 50, height: 50 } });
    const y = doc.createNode("RECTANGLE", { parentId: row, props: { width: 50, height: 50 } });
    // the row's items sit at x 0-50 and 60-110: dropping at x 55 lands between them
    dropInto(doc, page, [loose], { x: 55, y: 420 });
    expect(doc.children(row).map((c) => c.id)).toEqual([x, loose, y]);
  });

  it("does nothing for no layers, a locked layer or a page", () => {
    const { doc, page, loose } = scene();
    doc.setStyle(loose, { locked: true });
    expect(dropInto(doc, page, [], { x: 0, y: 0 })).toEqual([]);
    expect(dropInto(doc, page, [loose], { x: 450, y: 60 })).toEqual([]);
    expect(dropInto(doc, page, [page], { x: 450, y: 60 })).toEqual([]);
  });

  it("inside an auto layout frame a drop over a sibling frame only reorders: it does not nest the layer", () => {
    const { doc, page } = scene();
    const row = doc.createNode("FRAME", { parentId: page, props: { name: "Row", x: 0, y: 400, width: 300, height: 60, layoutMode: "HORIZONTAL", itemSpacing: 10 } as never });
    const one = doc.createNode("FRAME", { parentId: row, props: { width: 50, height: 50 } });
    const two = doc.createNode("FRAME", { parentId: row, props: { width: 50, height: 50 } });
    expect(dropInto(doc, page, [one], { x: 80, y: 420 })).toEqual([]); // over the second frame
    expect(doc.getNode(one)!.parentId).toBe(row);
    expect(doc.getNode(two)!.parentId).toBe(row);
    // dragged out of the row, onto empty canvas
    expect(dropInto(doc, page, [one], { x: 700, y: 700 })).toEqual([one]);
    expect(doc.getNode(one)!.parentId).toBe(page);
  });
});
