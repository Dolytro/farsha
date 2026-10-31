import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { applyPickedColor } from "./eyedropper";

const fillsOf = (doc: DesignDoc, id: string) => (doc.getNode(id) as unknown as { fills: { color: string; opacity: number }[] }).fills;

describe("applyPickedColor", () => {
  it("replaces the top fill of every selected layer with fills and keeps its opacity", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("RECTANGLE", { parentId: page, props: { fills: [{ type: "SOLID", color: "#111111", opacity: 0.5 }] } });
    const b = doc.createNode("ELLIPSE", { parentId: page });
    const g = doc.createNode("GROUP", { parentId: page });
    expect(applyPickedColor(doc, [a, b, g], "#FF8800")).toBe(2);
    expect(fillsOf(doc, a)).toEqual([{ type: "SOLID", color: "#ff8800", opacity: 0.5 }]);
    expect(fillsOf(doc, b)[0]!.color).toBe("#ff8800");
  });

  it("only replaces the top fill of a layer with several, and fills an empty one", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("RECTANGLE", { parentId: page, props: { fills: [{ type: "SOLID", color: "#000000", opacity: 1 }, { type: "SOLID", color: "#ffffff", opacity: 1 }] } });
    const b = doc.createNode("RECTANGLE", { parentId: page, props: { fills: [] } });
    applyPickedColor(doc, [a, b], "#00ff00");
    expect(fillsOf(doc, a).map((f) => f.color)).toEqual(["#000000", "#00ff00"]);
    expect(fillsOf(doc, b).map((f) => f.color)).toEqual(["#00ff00"]);
  });

  it("is one undo step and ignores bad colours", () => {
    const doc = new DesignDoc();
    const a = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id });
    const before = fillsOf(doc, a)[0]!.color;
    expect(applyPickedColor(doc, [a], "red")).toBe(0);
    applyPickedColor(doc, [a], "#123456");
    doc.undo();
    expect(fillsOf(doc, a)[0]!.color).toBe(before);
  });
});
