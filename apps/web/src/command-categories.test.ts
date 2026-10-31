import { describe, expect, it } from "vitest";
import { categoryMap, sortByCategory } from "./command-categories";
import type { MenuNode } from "./main-menu";

const menu: MenuNode[] = [
  { label: "File", children: [{ id: "new-file", label: "New" }, { label: "Export", children: [{ id: "export-pdf", label: "PDF" }] }] },
  { label: "Object", children: [{ id: "group", label: "Group" }, { id: "new-file", label: "again" }] },
];

describe("categoryMap", () => {
  it("uses the menu section of a command, including submenus, and the first one that lists it", () => {
    const m = categoryMap(menu, ["new-file", "export-pdf", "group"]);
    expect(m.get("new-file")).toBe("File");
    expect(m.get("export-pdf")).toBe("File");
    expect(m.get("group")).toBe("Object");
  });
  it("puts tools, alignment and preferences commands in their own groups and the rest in Other", () => {
    const m = categoryMap(menu, ["tool-pen", "align-left", "preset-compact", "theme-dark", "undo"]);
    expect([m.get("tool-pen"), m.get("align-left"), m.get("preset-compact"), m.get("theme-dark"), m.get("undo")]).toEqual(["Tools", "Arrange", "Preferences", "Preferences", "Other"]);
  });
});

describe("sortByCategory", () => {
  it("orders groups as in the menu bar and keeps the order inside a group", () => {
    const cats = new Map([["a", "Object"], ["b", "File"], ["c", "Other"], ["d", "File"], ["e", "Tools"]]);
    const sorted = sortByCategory(["a", "b", "c", "d", "e"].map((id) => ({ id })), cats).map((c) => c.id);
    expect(sorted).toEqual(["b", "d", "a", "e", "c"]);
  });
});
