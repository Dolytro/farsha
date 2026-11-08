import { describe, expect, it } from "vitest";
import { renameLayers, renamedLayer } from "./batch-rename";

const layers = [{ name: "Card", parent: "List" }, { name: "Card", parent: "List" }, { name: "Row", parent: "List" }];

describe("batch rename", () => {
  it("numbers layers with $n from the start number", () => {
    expect(renameLayers(layers, { pattern: "Item $n" })).toEqual(["Item 1", "Item 2", "Item 3"]);
    expect(renameLayers(layers, { pattern: "Item $n", start: 10 })).toEqual(["Item 10", "Item 11", "Item 12"]);
  });
  it("pads with zeros ($0 is two digits, $00 three)", () => {
    expect(renameLayers(layers, { pattern: "$0" })).toEqual(["01", "02", "03"]);
    expect(renameLayers(layers, { pattern: "x$00", start: 8 })).toEqual(["x008", "x009", "x010"]);
  });
  it("keeps the old name with $& and the parent with $p", () => {
    expect(renamedLayer(layers[2]!, 2, { pattern: "$p / $& ($n)" })).toBe("List / Row (3)");
  });
  it("finds and replaces first, ignoring case unless asked", () => {
    expect(renamedLayer({ name: "Big card" }, 0, { pattern: "", find: "CARD", replace: "tile" })).toBe("Big tile");
    expect(renamedLayer({ name: "Big card" }, 0, { pattern: "", find: "CARD", replace: "tile", caseSensitive: true })).toBe("Big card");
    expect(renamedLayer({ name: "a.b" }, 0, { pattern: "", find: ".", replace: "-" })).toBe("a-b");
    expect(renamedLayer({ name: "Big card" }, 0, { pattern: "$& $n", find: "Big", replace: "Small" })).toBe("Small card 1");
  });
  it("never produces an empty name", () => {
    expect(renamedLayer({ name: "Card" }, 0, { pattern: "  " })).toBe("Card");
    expect(renamedLayer({ name: "Card" }, 0, { pattern: "$p" })).toBe("Card");
  });
});
