import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { flipSelection, toggleHidden, toggleLocked } from "./actions";

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
