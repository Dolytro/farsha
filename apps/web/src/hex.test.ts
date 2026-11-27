import { describe, expect, it } from "vitest";
import { parseHex } from "./hex";

describe("parseHex", () => {
  it("accepts 6 digits with or without #", () => {
    expect(parseHex("FF0000")).toBe("#ff0000");
    expect(parseHex(" #00ff88 ")).toBe("#00ff88");
  });
  it("expands 3 digits", () => expect(parseHex("f0a")).toBe("#ff00aa"));
  it("rejects anything else", () => {
    for (const bad of ["", "ff", "gg0000", "ff00000", "#12"]) expect(parseHex(bad)).toBeNull();
  });
});

import { parseHexAlpha } from "./hex";

describe("parseHexAlpha", () => {
  it("reads 8 and 4 digit colours as colour plus opacity", () => {
    expect(parseHexAlpha("#FF000080")).toEqual({ hex: "#ff0000", alpha: 0.5 });
    expect(parseHexAlpha("f008")).toEqual({ hex: "#ff0000", alpha: 0.53 });
    expect(parseHexAlpha("00ff00ff")).toEqual({ hex: "#00ff00", alpha: 1 });
  });
  it("keeps plain 3 and 6 digit colours without an alpha and refuses the rest", () => {
    expect(parseHexAlpha("abc")).toEqual({ hex: "#aabbcc" });
    expect(parseHexAlpha("12345")).toBeNull();
  });
});
