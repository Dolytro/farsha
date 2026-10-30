import { describe, expect, it } from "vitest";
import { localFileName } from "./file-name";

describe("localFileName", () => {
  it("adds the extension once", () => {
    expect(localFileName("Landing page")).toBe("Landing page.canvylo");
    expect(localFileName("Landing page.canvylo")).toBe("Landing page.canvylo");
  });
  it("replaces characters that are not allowed in file names", () => expect(localFileName('a/b:c?')).toBe("a_b_c_.canvylo"));
  it("falls back to Untitled", () => expect(localFileName("  ")).toBe("Untitled.canvylo"));
});
