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
