import { describe, expect, it } from "vitest";
import { filterCommands } from "./command-filter";

const cmds = [
  { label: "Add auto layout" },
  { label: "Create component", keywords: "main symbol" },
  { label: "Zoom to fit" },
  { label: "Auto layout: remove", keywords: "" },
  { label: "Flip horizontal" },
];

describe("filterCommands", () => {
  it("returns everything for an empty query", () => expect(filterCommands(cmds, "  ")).toHaveLength(5));
  it("needs every word to match", () => expect(filterCommands(cmds, "auto layout").map((c) => c.label)).toEqual(["Auto layout: remove", "Add auto layout"]));
  it("matches keywords", () => expect(filterCommands(cmds, "symbol").map((c) => c.label)).toEqual(["Create component"]));
  it("ranks a label that starts with the word first", () => expect(filterCommands(cmds, "zoom")[0]!.label).toBe("Zoom to fit"));
  it("finds nothing for a miss", () => expect(filterCommands(cmds, "xyz")).toEqual([]));
});
