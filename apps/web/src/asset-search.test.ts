import { describe, expect, it } from "vitest";
import { filterAssets } from "./asset-search";

const items = [
  { name: "Button", description: "Primary action", variantProps: { size: "large" } },
  { name: "Card" },
  { name: "Button small", variantProps: { size: "small" } },
];

describe("filterAssets", () => {
  it("returns everything for an empty query", () => {
    expect(filterAssets(items, "  ")).toEqual(items);
  });
  it("matches name, description and variants, any case", () => {
    expect(filterAssets(items, "BUTTON").map((i) => i.name)).toEqual(["Button", "Button small"]);
    expect(filterAssets(items, "primary").map((i) => i.name)).toEqual(["Button"]);
    expect(filterAssets(items, "size small").map((i) => i.name)).toEqual(["Button small"]);
  });
  it("needs every word", () => {
    expect(filterAssets(items, "button card")).toEqual([]);
  });
});
