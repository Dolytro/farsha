import { describe, expect, it } from "vitest";
import { nextCopyName } from "./copy-name";

describe("nextCopyName", () => {
  it("adds one to a trailing number", () => {
    expect(nextCopyName("Card 1")).toBe("Card 2");
    expect(nextCopyName("Frame 12")).toBe("Frame 13");
    expect(nextCopyName("Button9")).toBe("Button10");
  });
  it("leaves names without a trailing number alone", () => {
    expect(nextCopyName("Hero")).toBe("Hero");
    expect(nextCopyName("Hero 2 copy")).toBe("Hero 2 copy");
    expect(nextCopyName("")).toBe("");
  });
  it("keeps zeros out of the way", () => {
    expect(nextCopyName("Item 009")).toBe("Item 10");
  });
});
