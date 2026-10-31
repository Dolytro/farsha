import { describe, expect, it } from "vitest";
import { GOOGLE_FONTS, firstFamily, fontStack, googleFontUrl, isGoogleFont, matchFonts } from "./fonts";

describe("fonts", () => {
  it("finds the first family of a stack", () => {
    expect(firstFamily("Inter, system-ui, sans-serif")).toBe("Inter");
    expect(firstFamily("'Times New Roman', Times, serif")).toBe("Times New Roman");
  });
  it("knows its Google fonts and gives them a fallback of the right kind", () => {
    expect(isGoogleFont("Poppins, sans-serif")).toBe(true);
    expect(isGoogleFont("Inter, system-ui")).toBe(false);
    expect(isGoogleFont("Arial, Helvetica")).toBe(false);
    expect(fontStack("Playfair Display")).toBe("'Playfair Display', serif");
    expect(fontStack("Roboto Mono")).toBe("'Roboto Mono', monospace");
    expect(fontStack("My Local Font")).toBe("'My Local Font', sans-serif");
    expect(fontStack("Inter")).toBe("Inter, sans-serif");
  });
  it("builds a stylesheet address with every weight and a safe encoding", () => {
    const url = googleFontUrl("Open Sans");
    expect(url.startsWith("https://fonts.googleapis.com/css2?family=Open+Sans:wght@")).toBe(true);
    expect(url).toContain("900");
    expect(googleFontUrl("A&B<c>")).not.toMatch(/[<>&]\w*<|<c>/);
  });
  it("has no duplicate names", () => {
    const names = GOOGLE_FONTS.map((f) => f.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
  it("filters by every typed word in any case", () => {
    expect(matchFonts(["Open Sans", "Noto Sans", "Lora"], "sans")).toEqual(["Open Sans", "Noto Sans"]);
    expect(matchFonts(["Open Sans", "Noto Sans", "Lora"], "NOTO sa")).toEqual(["Noto Sans"]);
    expect(matchFonts(["Open Sans"], "")).toEqual(["Open Sans"]);
    expect(matchFonts(["Open Sans"], "zzz")).toEqual([]);
  });
});
