import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { extractDefaults, withDefaults } from "./defaults";

const red = [{ type: "SOLID" as const, color: "#ff0000", opacity: 1 }];

describe("shape defaults", () => {
  it("copies the look of a shape, and gives nothing for text or groups", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const r = doc.createNode("RECTANGLE", { parentId: page, props: { fills: red, strokes: red, strokeWidth: 3, cornerRadius: 8, opacity: 0.5 } });
    expect(extractDefaults(doc.getNode(r))).toEqual({ fills: red, strokes: red, strokeWidth: 3, cornerRadius: 8, opacity: 0.5 });
    expect(extractDefaults(doc.getNode(doc.createNode("TEXT", { parentId: page })))).toBeNull();
    expect(extractDefaults(undefined)).toBeNull();
  });

  it("copies the paints rather than sharing them", () => {
    const doc = new DesignDoc();
    const r = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { fills: red } });
    const d = extractDefaults(doc.getNode(r))!;
    expect(d.fills![0]).not.toBe(red[0]);
  });

  it("lays the defaults over new rectangles, ellipses and frames only", () => {
    const d = { fills: red, strokeWidth: 2, cornerRadius: 6 };
    expect(withDefaults("RECTANGLE", { name: "Rectangle" }, d)).toEqual({ name: "Rectangle", fills: red, strokeWidth: 2, cornerRadius: 6 });
    expect(withDefaults("ELLIPSE", {}, d)).toEqual({ fills: red, strokeWidth: 2 });
    expect(withDefaults("TEXT", { name: "Text" }, d)).toEqual({ name: "Text" });
    expect(withDefaults("VECTOR", {}, d)).toEqual({});
    expect(withDefaults("RECTANGLE", { name: "x" }, null)).toEqual({ name: "x" });
  });
});
