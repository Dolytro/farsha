import { describe, expect, it } from "vitest";
import { insertionIndex, reorderTarget } from "./auto-layout-reorder";

describe("insertionIndex", () => {
  it("counts the layers whose middle is before the pointer", () => {
    const centres = [10, 50, 90];
    expect(insertionIndex(centres, 0)).toBe(0);
    expect(insertionIndex(centres, 30)).toBe(1);
    expect(insertionIndex(centres, 70)).toBe(2);
    expect(insertionIndex(centres, 500)).toBe(3);
    expect(insertionIndex([], 10)).toBe(0);
  });
});

describe("reorderTarget", () => {
  const order = ["a", "b", "c", "d"];
  it("moves a layer to the end", () => {
    expect(reorderTarget(order, "a", ["b", "c", "d"], 3)).toBe(3);
  });
  it("moves a layer to the front", () => {
    expect(reorderTarget(order, "d", ["a", "b", "c"], 0)).toBe(0);
  });
  it("moves a layer into the middle", () => {
    expect(reorderTarget(order, "a", ["b", "c", "d"], 1)).toBe(1); // before c: b, a, c, d
  });
  it("returns null when it already sits there", () => {
    expect(reorderTarget(order, "b", ["a", "c", "d"], 1)).toBeNull();
    expect(reorderTarget(order, "d", ["a", "b", "c"], 3)).toBeNull();
    expect(reorderTarget(order, "a", ["b", "c", "d"], 0)).toBeNull();
  });
  it("keeps layers that are not in the layout where they are", () => {
    // x is out of the flow: moving a before c puts it right before c in the full list
    const full = ["a", "x", "b", "c"];
    expect(reorderTarget(full, "a", ["b", "c"], 1)).toBe(2); // x, b, a, c
  });
  it("ignores an unknown neighbour", () => {
    expect(reorderTarget(order, "a", ["zzz"], 0)).toBeNull();
  });
});
