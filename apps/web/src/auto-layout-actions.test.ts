import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { addAutoLayout, removeAutoLayout } from "./auto-layout-actions";

function row() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  // three boxes in a row, 12px apart, in the wrong creation order
  const c = doc.createNode("RECTANGLE", { parentId: page, props: { x: 200, y: 50, width: 40, height: 20 } });
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 100, y: 50, width: 40, height: 20 } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 152, y: 50, width: 36, height: 30 } });
  return { doc, page, a, b, c };
}

describe("addAutoLayout", () => {
  it("wraps loose layers in a frame, picks the direction, order and gap from their positions", () => {
    const { doc, page, a, b, c } = row();
    const [frame] = addAutoLayout(doc, [c, a, b]);
    const f = doc.getNode(frame!)!;
    expect(f).toMatchObject({ type: "FRAME", layoutMode: "HORIZONTAL", itemSpacing: 12, primarySizing: "HUG", counterSizing: "HUG" });
    expect(doc.children(frame!).map((n) => n.id)).toEqual([a, b, c]);
    expect(doc.children(page).map((n) => n.id)).toEqual([frame]);
    expect([f.x, f.y]).toEqual([100, 50]);
    expect([f.width, f.height]).toEqual([140, 30]); // 40 + 12 + 36 + 12 + 40, tallest 30
    expect(doc.getNode(b)).toMatchObject({ x: 52, y: 0 });
  });

  it("adds auto layout to a selected frame without moving anything visibly", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 100, height: 200 } });
    const a = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 10, width: 80, height: 40 } });
    const b = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 10, y: 70, width: 80, height: 40 } });
    addAutoLayout(doc, [frame]);
    expect(doc.getNode(frame)).toMatchObject({ layoutMode: "VERTICAL", itemSpacing: 20, paddingLeft: 10, paddingTop: 10, paddingRight: 10, paddingBottom: 90 });
    expect(doc.getNode(a)).toMatchObject({ x: 10, y: 10 });
    expect(doc.getNode(b)).toMatchObject({ x: 10, y: 70 });
  });

  it("is one undo step and can be removed", () => {
    const { doc, page, a, b, c } = row();
    const [frame] = addAutoLayout(doc, [a, b, c]);
    doc.undo();
    expect(doc.children(page).map((n) => n.id).sort()).toEqual([a, b, c].sort());
    doc.redo();
    removeAutoLayout(doc, [frame!]);
    expect(doc.getNode(frame!)).toMatchObject({ layoutMode: null });
  });
});
