import { describe, expect, it } from "vitest";
import { fitSize, isImageFile } from "./images";

describe("fitSize", () => {
  it("keeps small images at their own size", () => {
    expect(fitSize(300, 200)).toEqual({ width: 300, height: 200 });
  });

  it("shrinks the longest edge to the limit, keeping the ratio", () => {
    expect(fitSize(1600, 800)).toEqual({ width: 800, height: 400 });
    expect(fitSize(400, 2000)).toEqual({ width: 160, height: 800 });
  });

  it("never returns an empty size", () => {
    expect(fitSize(0, 0)).toEqual({ width: 1, height: 1 });
    expect(fitSize(1, 5000)).toEqual({ width: 1, height: 800 });
  });
});

describe("isImageFile", () => {
  it("accepts the supported raster types only", () => {
    expect(isImageFile({ type: "image/png" })).toBe(true);
    expect(isImageFile({ type: "image/jpeg" })).toBe(true);
    expect(isImageFile({ type: "image/svg+xml" })).toBe(false);
    expect(isImageFile({ type: "text/html" })).toBe(false);
  });
});
