import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { componentSetFrames } from "./component-set-frames";

describe("componentSetFrames", () => {
  function setup() {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const main = doc.createNode("FRAME", { parentId: page, props: { name: "Button", x: 0, y: 0, width: 100, height: 40 } });
    doc.createComponent([main]);
    return { doc, page, main };
  }

  it("is empty for a component without variants", () => {
    const { doc, page } = setup();
    expect(componentSetFrames(doc, page)).toEqual([]);
  });

  it("draws one box round all the variants of a set, with a margin", () => {
    const { doc, page, main } = setup();
    const v2 = doc.addVariant(main);
    const v3 = doc.addVariant(main);
    const frames = componentSetFrames(doc, page);
    expect(frames).toHaveLength(1);
    const f = frames[0]!;
    expect(f.count).toBe(3);
    expect(f.name).toBe("Button");
    const boxes = [main, v2, v3].map((id) => doc.absoluteBox(id)!);
    expect(f.box.x).toBe(Math.min(...boxes.map((b) => b.x)) - 16);
    expect(f.box.y).toBe(Math.min(...boxes.map((b) => b.y)) - 16);
    expect(f.box.x + f.box.width).toBe(Math.max(...boxes.map((b) => b.x + b.width)) + 16);
    expect(f.box.y + f.box.height).toBe(Math.max(...boxes.map((b) => b.y + b.height)) + 16);
  });

  it("keeps separate sets apart and ignores hidden variants", () => {
    const { doc, page, main } = setup();
    doc.addVariant(main);
    const other = doc.createNode("FRAME", { parentId: page, props: { name: "Card", x: 0, y: 300, width: 80, height: 60 } });
    const otherMain = doc.createComponent([other]);
    doc.addVariant(otherMain);
    expect(componentSetFrames(doc, page).map((f) => f.name).sort()).toEqual(["Button", "Card"]);
    doc.setStyle(doc.variantsOf(main)[1]!.id, { visible: false });
    expect(componentSetFrames(doc, page).map((f) => f.name)).toEqual(["Card"]);
  });
});
