import { describe, expect, it } from "vitest";
import { parseTheme, resolveTheme } from "./theme";

describe("theme", () => {
  it("follows the system only when asked to", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("reads a saved preference, starts dark and falls back to system", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("blue")).toBe("system");
    expect(parseTheme(null)).toBe("dark");
  });
});
