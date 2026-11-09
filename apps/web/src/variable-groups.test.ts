import { describe, expect, it } from "vitest";
import { groupVariables, joinName, splitName } from "./variable-groups";

describe("variable names", () => {
  it("splits a name into group path and leaf", () => {
    expect(splitName("Primary")).toEqual({ path: "", leaf: "Primary" });
    expect(splitName("brand/primary/500")).toEqual({ path: "brand/primary", leaf: "500" });
    expect(splitName(" brand / primary ")).toEqual({ path: "brand", leaf: "primary" });
    expect(splitName("/x//")).toEqual({ path: "", leaf: "x" });
  });

  it("joins a group and a leaf, dropping empty parts", () => {
    expect(joinName("brand", "primary")).toBe("brand/primary");
    expect(joinName("", "Primary")).toBe("Primary");
    expect(joinName("a/b", "c/d")).toBe("a/b/c/d");
    expect(joinName("a//b", " c ")).toBe("a/b/c");
  });
});

describe("groupVariables", () => {
  it("puts ungrouped variables first and groups in order of first appearance", () => {
    const vars = [{ name: "brand/a" }, { name: "Plain" }, { name: "text/body" }, { name: "brand/b" }];
    const groups = groupVariables(vars);
    expect(groups.map((g) => g.path)).toEqual(["", "brand", "text"]);
    expect(groups[0]!.items.map((i) => i.leaf)).toEqual(["Plain"]);
    expect(groups[1]!.items.map((i) => i.leaf)).toEqual(["a", "b"]);
    expect(groups[1]!.items[1]!.variable).toBe(vars[3]);
  });

  it("returns nothing for no variables", () => {
    expect(groupVariables([])).toEqual([]);
  });
});
