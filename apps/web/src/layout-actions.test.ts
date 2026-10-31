import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { resizeToFit, setLockAspect, setSizing } from "./layout-actions";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 500, height: 400 } });
  const a = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 50, y: 40, width: 100, height: 60 } });
  const b = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 200, y: 120, width: 80, height: 80 } });
  return { doc, page, frame, a, b };
}

describe("setLockAspect", () => {
  it("locks and unlocks, and ignores the page", () => {
    const { doc, a, page } = setup();
    expect(setLockAspect(doc, [a, page], true)).toBe(1);
    expect(doc.getNode(a)!.lockAspect).toBe(true);
    setLockAspect(doc, [a], false);
    expect(doc.getNode(a)!.lockAspect ?? false).toBe(false);
  });
});

describe("resizeToFit", () => {
  it("makes the frame exactly cover its layers without moving them on the canvas", () => {
    const { doc, frame, a, b } = setup();
    const before = doc.absoluteBox(b)!;
    expect(resizeToFit(doc, [frame])).toBe(1);
    expect(doc.getNode(frame)).toMatchObject({ x: 150, y: 140, width: 230, height: 160 });
    expect(doc.getNode(a)).toMatchObject({ x: 0, y: 0 });
    expect(doc.absoluteBox(b)).toMatchObject({ x: before.x, y: before.y });
  });
  it("skips auto layout frames, empty frames and other layers", () => {
    const { doc, page, a } = setup();
    const empty = doc.createNode("FRAME", { parentId: page, props: { width: 10, height: 10 } });
    const auto = doc.createNode("FRAME", { parentId: page, props: { layoutMode: "HORIZONTAL" } as never });
    doc.createNode("RECTANGLE", { parentId: auto });
    expect(resizeToFit(doc, [empty, auto, a])).toBe(0);
  });
});

describe("setSizing", () => {
  it("hugs the right axis of a row or a column", () => {
    const { doc, page } = setup();
    const row = doc.createNode("FRAME", { parentId: page, props: { layoutMode: "HORIZONTAL" } as never });
    const col = doc.createNode("FRAME", { parentId: page, props: { layoutMode: "VERTICAL" } as never });
    setSizing(doc, [row, col], "width", "HUG");
    expect(doc.getNode(row)).toMatchObject({ primarySizing: "HUG" });
    expect(doc.getNode(col)).toMatchObject({ counterSizing: "HUG" });
    setSizing(doc, [row, col], "height", "HUG");
    expect(doc.getNode(row)).toMatchObject({ counterSizing: "HUG" });
    expect(doc.getNode(col)).toMatchObject({ primarySizing: "HUG" });
  });
  it("fills only inside an auto layout frame, and hugs only auto layout frames", () => {
    const { doc, page, frame, a } = setup();
    expect(setSizing(doc, [a], "width", "FILL")).toBe(0);
    expect(setSizing(doc, [frame], "width", "HUG")).toBe(0);
    const row = doc.createNode("FRAME", { parentId: page, props: { layoutMode: "HORIZONTAL" } as never });
    const kid = doc.createNode("RECTANGLE", { parentId: row });
    expect(setSizing(doc, [kid], "height", "FILL")).toBe(1);
    expect(doc.getNode(kid)).toMatchObject({ layoutSizingV: "FILL" });
  });
});
