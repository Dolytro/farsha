import { describe, expect, it } from "vitest";
import { localFileName } from "./file-name";

describe("localFileName", () => {
  it("adds the extension once", () => {
    expect(localFileName("Landing page")).toBe("Landing page.farsha");
    expect(localFileName("Landing page.farsha")).toBe("Landing page.farsha");
  });
  it("replaces characters that are not allowed in file names", () => expect(localFileName('a/b:c?')).toBe("a_b_c_.farsha"));
  it("falls back to Untitled", () => expect(localFileName("  ")).toBe("Untitled.farsha"));
});
