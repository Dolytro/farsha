import { describe, expect, it } from "vitest";
import { cssColor, parseCssColor, hexToHsv, hexToRgb, hslToRgb, hsvToHex, normalizeHex, rgbToHex, rgbToHsl, usedColors } from "./color-math";

describe("normalizeHex", () => {
  it("accepts 3 and 6 digits with or without #, and rejects the rest", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("ff8800")).toBe("#ff8800");
    expect(normalizeHex(" #FF8800 ")).toBe("#ff8800");
    expect(normalizeHex("ff88")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("")).toBeNull();
  });
});

describe("conversions", () => {
  it("round-trips hex through rgb and hsv", () => {
    for (const hex of ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#123456", "#abcdef", "#808080"]) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
  it("knows the primaries in hsv and hsl", () => {
    expect(hexToHsv("#ff0000")).toMatchObject({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#00ff00").h).toBe(120);
    expect(hexToHsv("#0000ff").h).toBe(240);
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toMatchObject({ h: 0, s: 1, l: 0.5 });
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toMatchObject({ s: 0, l: 1 });
  });
  it("converts hsl back", () => {
    expect(hslToRgb({ h: 120, s: 1, l: 0.5 })).toEqual({ r: 0, g: 255, b: 0 });
    expect(hslToRgb({ h: 0, s: 0, l: 0.5 })).toEqual({ r: 128, g: 128, b: 128 });
  });
  it("clamps bad numbers", () => {
    expect(rgbToHex({ r: 300, g: -5, b: Number.NaN })).toBe("#ff0000");
  });
});

describe("usedColors", () => {
  it("lists solid colours once, most used first, ignoring gradients and junk", () => {
    const solid = (c: string) => ({ type: "SOLID", color: c, opacity: 1 });
    expect(usedColors([[solid("#FF0000"), solid("#00ff00")], [solid("#ff0000"), { type: "GRADIENT_LINEAR" }, null, solid("nope")]])).toEqual(["#ff0000", "#00ff00"]);
  });
});

describe("CSS colours", () => {
  it("writes rgb()", () => expect(cssColor("#112233")).toBe("rgb(17, 34, 51)"));
  it("reads hex, rgb, hsl and hsb text", () => {
    expect(parseCssColor("#ABC")).toBe("#aabbcc");
    expect(parseCssColor("rgb(17, 34, 51)")).toBe("#112233");
    expect(parseCssColor("rgb(17 34 51 / 50%)")).toBe("#112233");
    expect(parseCssColor("rgb(100%, 0%, 0%)")).toBe("#ff0000");
    expect(parseCssColor("hsl(0, 100%, 50%)")).toBe("#ff0000");
    expect(parseCssColor("hsb(120, 100%, 100%)")).toBe("#00ff00");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "red", "rgb(1,2)", "rgb(a,b,c)", "rgb(1,2,3,4,5)", "javascript:1"]) expect(parseCssColor(bad)).toBeNull();
  });
});
