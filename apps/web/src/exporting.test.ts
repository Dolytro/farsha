import { describe, expect, it } from "vitest";
import { exportFileName } from "./exporting";

describe("exportFileName", () => {
  it("adds the scale to bitmaps only", () => {
    expect(exportFileName("Button", "PNG", 2)).toBe("Button@2x.png");
    expect(exportFileName("Button", "PNG", 1)).toBe("Button.png");
    expect(exportFileName("Button", "SVG", 3)).toBe("Button.svg");
    expect(exportFileName("Hero", "JPG", 0.5)).toBe("Hero@0.5x.jpg");
  });
  it("cleans characters that are not allowed in file names", () => {
    expect(exportFileName('a/b:c*"d', "PNG", 1)).toBe("a_b_c_d.png");
    expect(exportFileName("  ", "SVG", 1)).toBe("Layer.svg");
  });
});
