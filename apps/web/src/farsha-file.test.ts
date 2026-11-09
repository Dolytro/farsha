import { describe, expect, it } from "vitest";
import { isFarshaFileName, maybeFarshaDragItem } from "./farsha-file";

describe("farsha-file", () => {
  it("recognises .farsha names in any case", () => {
    expect(isFarshaFileName("Site.farsha")).toBe(true);
    expect(isFarshaFileName("Site.FARSHA ")).toBe(true);
    expect(isFarshaFileName("photo.png")).toBe(false);
    expect(isFarshaFileName("farsha")).toBe(false);
  });
  it("accepts untyped drag items only", () => {
    expect(maybeFarshaDragItem({ kind: "file", type: "" })).toBe(true);
    expect(maybeFarshaDragItem({ kind: "file", type: "image/png" })).toBe(false);
    expect(maybeFarshaDragItem({ kind: "string", type: "" })).toBe(false);
  });
});
