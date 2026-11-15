import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { cssVariableBlock, cssVariableName, variablesUsed } from "./variable-code";

const solid = (color: string) => [{ type: "SOLID" as const, color, opacity: 1 }];

describe("cssVariableName", () => {
  it("makes a valid custom property name", () => {
    expect(cssVariableName("Brand / Primary Blue")).toBe("--brand-primary-blue");
    expect(cssVariableName("  Text_color!! ")).toBe("--text-color");
    expect(cssVariableName("***")).toBe("--color");
    expect(cssVariableName("Ünï")).toBe("--uni");
  });
});

describe("variablesUsed", () => {
  function setup() {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode("RECTANGLE", { parentId: page, props: { fills: solid("#111111"), strokes: solid("#222222") } });
    const brand = doc.createColorVariable("Brand / Primary", "#123456");
    return { doc, rect, brand };
  }
  it("lists bound fills and strokes with the value of every mode", () => {
    const { doc, rect, brand } = setup();
    doc.bindPaintVariable(rect, "fills", 0, brand);
    doc.bindPaintVariable(rect, "strokes", 0, brand);
    const dark = doc.addMode("Dark");
    doc.updateColorVariable(brand, { modeId: dark, color: "#abcdef" });
    const uses = variablesUsed(doc, doc.getNode(rect)!);
    expect(uses.map((u) => u.role)).toEqual(["Fill", "Stroke"]);
    expect(uses[0]).toMatchObject({ name: "Brand / Primary", cssName: "--brand-primary", values: [{ mode: "Mode 1", color: "#123456" }, { mode: "Dark", color: "#abcdef" }] });
  });
  it("ignores paints that are not bound", () => {
    const { doc, rect } = setup();
    expect(variablesUsed(doc, doc.getNode(rect)!)).toEqual([]);
    expect(cssVariableBlock([])).toBe("");
  });
  it("writes a :root block once per variable, other modes as a comment", () => {
    const { doc, rect, brand } = setup();
    doc.bindPaintVariable(rect, "fills", 0, brand);
    doc.bindPaintVariable(rect, "strokes", 0, brand);
    const dark = doc.addMode("Dark");
    doc.updateColorVariable(brand, { modeId: dark, color: "#abcdef" });
    expect(cssVariableBlock(variablesUsed(doc, doc.getNode(rect)!))).toBe(":root {\n  --brand-primary: #123456; /* Dark: #abcdef */\n}");
  });
  it("lists number variables bound to size, radius, gap or font size, in pixels", () => {
    const { doc, rect } = setup();
    const radius = doc.createValueVariable("NUMBER", "Radius / Card", "12");
    doc.bindProperty(rect, "cornerRadius", radius);
    const uses = variablesUsed(doc, doc.getNode(rect)!);
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatchObject({ role: "Number", cssName: "--radius-card", values: [{ color: "12px" }] });
    expect(cssVariableBlock(uses)).toBe(":root {\n  --radius-card: 12px;\n}");
  });
});
