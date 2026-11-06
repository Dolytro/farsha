import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { exportVariables, importVariables, parseVariables } from "./variable-json";

function sample() {
  const doc = new DesignDoc();
  const dark = doc.addMode("Dark");
  doc.renameMode("default", "Light");
  const c = doc.createColorVariable("Brand", "#ff0000");
  doc.updateColorVariable(c, { modeId: dark, color: "#00ff00" });
  doc.createValueVariable("NUMBER", "Gap", "8");
  doc.createValueVariable("BOOLEAN", "Compact", "true");
  doc.createTextVariable("Title", "Hello");
  return doc;
}

describe("variables as JSON", () => {
  it("exports every kind with values by mode name", () => {
    const f = exportVariables(sample());
    expect(f.modes).toEqual(["Light", "Dark"]);
    expect(f.variables.find((v) => v.name === "Brand")).toEqual({ name: "Brand", type: "COLOR", values: { Light: "#ff0000", Dark: "#00ff00" } });
    expect(f.variables.map((v) => v.type).sort()).toEqual(["BOOLEAN", "COLOR", "NUMBER", "STRING"]);
  });
  it("imports into an empty document and gives the same file back", () => {
    const text = JSON.stringify(exportVariables(sample()));
    const target = new DesignDoc();
    expect(importVariables(target, parseVariables(text))).toBe(4);
    const back = exportVariables(target);
    expect(back.modes).toEqual(["Light", "Dark"]);
    expect(back.variables.sort((a, b) => a.name.localeCompare(b.name))).toEqual(exportVariables(sample()).variables.sort((a, b) => a.name.localeCompare(b.name)));
  });
  it("matches modes by name when importing into a document that has them", () => {
    const target = sample();
    importVariables(target, parseVariables(JSON.stringify({ version: 1, modes: ["Dark"], variables: [{ name: "Extra", type: "COLOR", values: { Dark: "#123456" } }] })));
    expect(target.modes().map((m) => m.name)).toEqual(["Light", "Dark"]);
  });
  it("repairs bad values and rejects files that are not variables", () => {
    const f = parseVariables(JSON.stringify({ modes: ["A"], variables: [{ name: "x", type: "COLOR", values: { A: "red" } }, { name: "n", type: "NUMBER", values: { A: "abc" } }, { name: 5, type: "COLOR" }, { name: "z", type: "NOPE" }] }));
    expect(f.variables).toEqual([{ name: "x", type: "COLOR", values: { A: "#000000" } }, { name: "n", type: "NUMBER", values: { A: "0" } }]);
    expect(() => parseVariables("{")).toThrow();
    expect(() => parseVariables("[]")).toThrow();
    expect(() => parseVariables(JSON.stringify({ modes: [], variables: [] }))).toThrow();
  });
});
