import { describe, expect, it } from "vitest";
import { layoutText } from "./text";

const base = { fontFamily: "x", fontSize: 10, fontWeight: 400, letterSpacing: 0, lineHeight: "AUTO" as const, width: 100 };
// approx measure: 5.6px per character at size 10

describe("layoutText", () => {
  it("keeps one line per paragraph in auto width and reports the widest", () => {
    const r = layoutText({ ...base, characters: "hello world\nhi" });
    expect(r.lines).toEqual(["hello world", "hi"]);
    expect(r.width).toBeCloseTo(11 * 5.6);
    expect(r.height).toBe(24); // 2 lines x 12
  });

  it("wraps at the layer width in auto height and fixed modes", () => {
    const r = layoutText({ ...base, textAutoResize: "HEIGHT", width: 60, characters: "aaaa bbbb cccc" }); // 10 chars = 56px
    expect(r.lines).toEqual(["aaaa bbbb", "cccc"]);
    expect(r.height).toBe(24);
  });

  it("breaks a word that is wider than the box and keeps blank lines", () => {
    const r = layoutText({ ...base, textAutoResize: "NONE", width: 29, characters: "abcdefghij\n\nz" }); // 5 chars per line
    expect(r.lines).toEqual(["abcde", "fghij", "", "z"]);
  });

  it("uses a fixed line height when set", () => {
    const r = layoutText({ ...base, lineHeight: 20, characters: "a\nb\nc" });
    expect(r.height).toBe(60);
  });
});
