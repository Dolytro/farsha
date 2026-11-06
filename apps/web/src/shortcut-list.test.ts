import { describe, expect, it } from "vitest";
import { groupShortcuts } from "./shortcut-list";

const commands = [
  { id: "undo", label: "Undo", shortcut: "Ctrl+Z" },
  { id: "tool-rect", label: "Rectangle tool", shortcut: "R" },
  { id: "export-pdf", label: "Export frames to PDF…" },
  { id: "copy", label: "Copy", shortcut: "Ctrl+C" },
];
const categories = new Map([
  ["undo", "Edit"],
  ["copy", "Edit"],
  ["tool-rect", "Tools"],
  ["export-pdf", "File"],
]);

describe("groupShortcuts", () => {
  it("lists only commands that have a shortcut, grouped in menu order", () => {
    const groups = groupShortcuts(commands, categories);
    expect(groups.map((g) => g.label)).toEqual(["Edit", "Tools"]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["undo", "copy"]);
  });

  it("filters by name, shortcut or group", () => {
    expect(groupShortcuts(commands, categories, "rect")[0]!.items[0]!.id).toBe("tool-rect");
    expect(groupShortcuts(commands, categories, "ctrl+c")[0]!.items.map((i) => i.id)).toEqual(["copy"]);
    expect(groupShortcuts(commands, categories, "tools").map((g) => g.label)).toEqual(["Tools"]);
    expect(groupShortcuts(commands, categories, "zzz")).toEqual([]);
  });

  it("puts commands without a known group under Other, last", () => {
    const groups = groupShortcuts([...commands, { id: "x", label: "X", shortcut: "X" }], categories);
    expect(groups[groups.length - 1]!.label).toBe("Other");
  });
});
