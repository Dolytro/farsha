import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { addAutoLayout } from "./auto-layout-actions";

describe("auto layout over two frames", () => {
  it("keeps the gap between them (row)", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 100, height: 80 } });
    const b = doc.createNode("FRAME", { parentId: page, props: { x: 150, y: 0, width: 120, height: 80 } });
    const [wrapper] = addAutoLayout(doc, [a, b]);
    const w = doc.getNode(wrapper!)!;
    expect(w).toMatchObject({ layoutMode: "HORIZONTAL", itemSpacing: 50 });
    expect(doc.getNode(b)).toMatchObject({ x: 150, width: 120 });
  });
  it("keeps the gap between them (column) and with frames far from the origin", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { x: 500, y: 300, width: 100, height: 80 } });
    const b = doc.createNode("FRAME", { parentId: page, props: { x: 500, y: 460, width: 100, height: 80 } });
    const [wrapper] = addAutoLayout(doc, [a, b]);
    expect(doc.getNode(wrapper!)).toMatchObject({ layoutMode: "VERTICAL", itemSpacing: 80, x: 500, y: 300 });
    expect(doc.getNode(b)).toMatchObject({ y: 160 });
  });
});

describe("auto layout direction with different sizes", () => {
  it("a tall frame next to a short one is a row, and the gap is kept", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const tall = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 100, height: 1000 } });
    const short = doc.createNode("FRAME", { parentId: page, props: { x: 130, y: 0, width: 100, height: 100 } });
    const [wrapper] = addAutoLayout(doc, [tall, short]);
    expect(doc.getNode(wrapper!)).toMatchObject({ layoutMode: "HORIZONTAL", itemSpacing: 30 });
  });
  it("a wide frame above a narrow one is a column", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const wide = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 1000, height: 100 } });
    const narrow = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 140, width: 100, height: 100 } });
    const [wrapper] = addAutoLayout(doc, [wide, narrow]);
    expect(doc.getNode(wrapper!)).toMatchObject({ layoutMode: "VERTICAL", itemSpacing: 40 });
  });
  it("falls back to the spread when the boxes overlap both ways", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 100, height: 100 } });
    const b = doc.createNode("FRAME", { parentId: page, props: { x: 50, y: 20, width: 100, height: 100 } });
    const [wrapper] = addAutoLayout(doc, [a, b]);
    expect(doc.getNode(wrapper!)).toMatchObject({ layoutMode: "HORIZONTAL" });
  });
});
