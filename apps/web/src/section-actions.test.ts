import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { adjacentFrame } from "./actions";
import { prototypeFrames, topFrameOf } from "./prototype";
import { setSection, topLevelFrames, wrapInSection } from "./section-actions";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { x: 100, y: 100, width: 50, height: 50 } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { x: 200, y: 120, width: 40, height: 40 } });
  return { doc, page, a, b };
}

describe("sections", () => {
  it("wrapInSection puts the layers in a section with padding, keeping them where they were", () => {
    const { doc, page, a, b } = setup();
    const [section] = wrapInSection(doc, [a, b]);
    expect(doc.getNode(section!)).toMatchObject({ type: "FRAME", isSection: true, clipsContent: false, x: 60, y: 60, width: 220, height: 140, parentId: page });
    expect(doc.getNode(section!)!.name).toBe("Section 1");
    expect(doc.getNode(a)).toMatchObject({ parentId: section, x: 40, y: 40 });
    expect(doc.getNode(b)).toMatchObject({ parentId: section, x: 140, y: 60 });
  });

  it("numbers new sections", () => {
    const { doc, a, b } = setup();
    wrapInSection(doc, [a]);
    const [second] = wrapInSection(doc, [b]);
    expect(doc.getNode(second!)!.name).toBe("Section 2");
  });

  it("converts frames to sections and back, but not components", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const f = doc.createNode("FRAME", { parentId: page });
    const comp = doc.createNode("FRAME", { parentId: page });
    doc.createComponent([comp]);
    expect(setSection(doc, [f, comp], true)).toBe(1);
    expect(doc.getNode(f)).toMatchObject({ isSection: true, clipsContent: false });
    expect(setSection(doc, [f], false)).toBe(1);
    expect(doc.getNode(f)).toMatchObject({ isSection: false, clipsContent: true });
    expect(setSection(doc, [f], false)).toBe(0);
  });

  it("frames inside sections still count as the screens of the page", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const section = doc.createNode("FRAME", { parentId: page, props: { isSection: true, x: 0, y: 0, width: 1000, height: 1000 } });
    const inSection = doc.createNode("FRAME", { parentId: section, props: { x: 10, y: 10 } });
    const plain = doc.createNode("FRAME", { parentId: page, props: { x: 2000, y: 0 } });
    const inner = doc.createNode("RECTANGLE", { parentId: inSection });
    expect(topLevelFrames(doc, page).map((n) => n.id)).toEqual([inSection, plain]);
    expect(prototypeFrames(doc).map((n) => n.id)).toEqual([inSection, plain]);
    expect(topFrameOf(doc, inner)?.id).toBe(inSection);
    expect(adjacentFrame(doc, page, inSection, 1)).toBe(plain);
  });
});
