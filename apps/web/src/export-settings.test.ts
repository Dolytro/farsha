import { describe, expect, it } from "vitest";
import { addPreset, cleanSettings, exportPreset, newSetting, settingFileName } from "./export-settings";

describe("settingFileName", () => {
  it("uses the suffix, or @Nx for a scale other than 1", () => {
    expect(settingFileName("Hero image", { format: "PNG", scale: 1, suffix: "" })).toBe("Hero_image.png");
    expect(settingFileName("Hero image", { format: "PNG", scale: 2, suffix: "" })).toBe("Hero_image@2x.png");
    expect(settingFileName("Hero image", { format: "WEBP", scale: 3, suffix: "-large" })).toBe("Hero_image-large.webp");
    expect(settingFileName("Logo", { format: "SVG", scale: 2, suffix: "" })).toBe("Logo.svg");
    expect(settingFileName("Doc", { format: "JPG", scale: 1, suffix: "" })).toBe("Doc.jpg");
  });
  it("cleans the name and the suffix", () => {
    expect(settingFileName("a/b:c", { format: "PNG", scale: 1, suffix: "../x" })).toBe("a_b_c..x.png");
    expect(settingFileName("   ", { format: "PNG", scale: 1, suffix: "" })).toBe("Layer.png");
  });
});

describe("cleanSettings", () => {
  it("keeps valid settings, clamps scale and cuts the suffix", () => {
    const out = cleanSettings([{ format: "PNG", scale: 99, suffix: "x".repeat(100) }, { format: "WEBP", scale: Number.NaN, suffix: "" }]);
    expect(out[0]).toEqual({ format: "PNG", scale: 8, suffix: "x".repeat(40) });
    expect(out[1]).toEqual({ format: "WEBP", scale: 1, suffix: "" });
  });
  it("drops unknown formats and junk", () => {
    expect(cleanSettings([{ format: "GIF", scale: 1, suffix: "" }, null, 5, { scale: 1 }])).toEqual([]);
    expect(cleanSettings("nope")).toEqual([]);
    expect(newSetting()).toEqual({ format: "PNG", scale: 1, suffix: "" });
  });
});

describe("export presets", () => {
  it("iOS is 1x, 2x and 3x PNG with @Nx suffixes", () => {
    expect(exportPreset("iOS").map((x) => [x.scale, x.suffix, x.format])).toEqual([[1, "", "PNG"], [2, "@2x", "PNG"], [3, "@3x", "PNG"]]);
  });
  it("Android is mdpi to xxxhdpi", () => {
    expect(exportPreset("Android").map((x) => [x.scale, x.suffix])).toEqual([[1, "-mdpi"], [1.5, "-hdpi"], [2, "-xhdpi"], [3, "-xxhdpi"], [4, "-xxxhdpi"]]);
  });
  it("adding a preset keeps existing settings and skips duplicates", () => {
    const once = addPreset([newSetting()], "iOS");
    expect(once).toHaveLength(3);
    expect(addPreset(once, "iOS")).toHaveLength(3);
    expect(addPreset([], "Android")).toHaveLength(5);
  });
});
