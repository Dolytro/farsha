import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { selectMatching, selectChildren, selectInverse, selectParent, selectSibling } from "./selection-nav";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page });
  const a = doc.createNode("RECTANGLE", { parentId: frame });
  const b = doc.createNode("RECTANGLE", { parentId: frame });
  const c = doc.createNode("RECTANGLE", { parentId: frame, props: { locked: true } });
  const other = doc.createNode("ELLIPSE", { parentId: page });
  return { doc, page, frame, a, b, c, other };
}

describe("selection navigation", () => {
  it("Enter selects the children, skipping locked ones; leaves stay selected", () => {
    const { doc, frame, a, b } = setup();
    expect(selectChildren(doc, [frame])).toEqual([a, b]);
    expect(selectChildren(doc, [a])).toEqual([a]);
  });

  it("Shift+Enter selects the parent, and nothing for page-level layers", () => {
    const { doc, page, frame, a, other } = setup();
    expect(selectParent(doc, [a], page)).toEqual([frame]);
    expect(selectParent(doc, [other], page)).toEqual([]);
  });

  it("Tab walks the siblings top to bottom and wraps", () => {
    const { doc, page, a, b } = setup();
    // a was created first so it is lowest; the panel shows b above a
    expect(selectSibling(doc, [b], page, 1)).toEqual([a]);
    expect(selectSibling(doc, [a], page, 1)).toEqual([b]);
    expect(selectSibling(doc, [b], page, -1)).toEqual([a]);
  });

  it("Tab with nothing selected picks the first layer on the page", () => {
    const { doc, page, other } = setup();
    expect(selectSibling(doc, [], page, 1)).toEqual([other]);
  });

  it("inverse selects the other unlocked siblings", () => {
    const { doc, page, a, b } = setup();
    expect(selectInverse(doc, [a], page)).toEqual([b]);
  });
});

describe("selectMatching", () => {
  it("selects layers with the same type, fills and strokes anywhere on the page", () => {
    const { doc, page, frame, a, b } = setup();
    const red = [{ type: "SOLID" as const, color: "#ff0000", opacity: 1 }];
    doc.setStyle(a, { fills: red });
    doc.setStyle(b, { fills: red });
    const deep = doc.createNode("RECTANGLE", { parentId: frame, props: { fills: red } });
    const blue = doc.createNode("RECTANGLE", { parentId: page, props: { fills: [{ type: "SOLID", color: "#0000ff", opacity: 1 }] } });
    const ellipse = doc.createNode("ELLIPSE", { parentId: page, props: { fills: red } });
    const got = selectMatching(doc, [a], page);
    expect(got.sort()).toEqual([a, b, deep].sort());
    expect(got).not.toContain(blue);
    expect(got).not.toContain(ellipse);
  });

  it("matches the font of text layers", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const t1 = doc.createNode("TEXT", { parentId: page, props: { fontSize: 20 } });
    const t2 = doc.createNode("TEXT", { parentId: page, props: { fontSize: 20 } });
    const t3 = doc.createNode("TEXT", { parentId: page, props: { fontSize: 30 } });
    expect(selectMatching(doc, [t1], page).sort()).toEqual([t1, t2].sort());
    expect(selectMatching(doc, [t3], page)).toEqual([t3]);
  });

  it("skips hidden and locked layers and does nothing without a selection", () => {
    const { doc, page, a, b } = setup();
    doc.setStyle(b, { locked: true });
    expect(selectMatching(doc, [a], page)).not.toContain(b);
    expect(selectMatching(doc, [], page)).toEqual([]);
  });
});
