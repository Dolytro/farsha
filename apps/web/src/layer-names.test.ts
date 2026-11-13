import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { nextLayerName } from "./layer-names";

describe("nextLayerName", () => {
  it("starts at 1", () => {
    expect(nextLayerName(new DesignDoc(), "Rectangle")).toBe("Rectangle 1");
  });
  it("goes one past the highest number in use, on any page", () => {
    const doc = new DesignDoc();
    const first = doc.pages()[0]!.id;
    const second = doc.createNode("PAGE", { parentId: doc.rootId, props: { name: "Page 2" } });
    doc.createNode("RECTANGLE", { parentId: first, props: { name: "Rectangle 1" } });
    const frame = doc.createNode("FRAME", { parentId: first, props: { name: "Card" } });
    doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Rectangle 4" } });
    doc.createNode("RECTANGLE", { parentId: second, props: { name: "Rectangle 2" } });
    expect(nextLayerName(doc, "Rectangle")).toBe("Rectangle 5");
  });
  it("counts an unnumbered name as 0 and ignores other names", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    doc.createNode("RECTANGLE", { parentId: page, props: { name: "Rectangle" } });
    doc.createNode("RECTANGLE", { parentId: page, props: { name: "Rectangle copy 7" } });
    doc.createNode("RECTANGLE", { parentId: page, props: { name: "My Rectangle 9" } });
    expect(nextLayerName(doc, "Rectangle")).toBe("Rectangle 1");
  });
  it("is not confused by regex characters in the base name", () => {
    const doc = new DesignDoc();
    doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { name: "A+B 2" } });
    expect(nextLayerName(doc, "A+B")).toBe("A+B 3");
  });
});
