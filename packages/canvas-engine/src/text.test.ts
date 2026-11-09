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

import { lineSegments, rangeColor, runColor, setRangeColor, setRangeStyle } from "./text";

describe("run colours", () => {
  it("accepts only #rrggbb colours and lower-cases them", () => {
    expect(runColor("#FF8800")).toBe("#ff8800");
    expect(runColor("red")).toBeUndefined();
    expect(runColor("#f80")).toBeUndefined();
    expect(runColor('#ff0000" onload="x')).toBeUndefined();
    expect(runColor(5)).toBeUndefined();
  });

  it("colours a range and keeps the rest plain", () => {
    const runs = setRangeColor(undefined, 10, 2, 5, "#ff0000");
    expect(runs).toEqual([{ start: 2, end: 5, color: "#ff0000" }]);
  });

  it("keeps bold and colour together, and neighbouring colours apart", () => {
    let runs = setRangeStyle(undefined, 10, 0, 6, "bold", true);
    runs = setRangeColor(runs, 10, 3, 8, "#00ff00");
    runs = setRangeColor(runs, 10, 6, 9, "#0000ff");
    expect(runs).toEqual([
      { start: 0, end: 3, bold: true },
      { start: 3, end: 6, bold: true, color: "#00ff00" },
      { start: 6, end: 9, color: "#0000ff" },
    ]);
  });

  it("styling a range later keeps its colour", () => {
    const coloured = setRangeColor(undefined, 6, 0, 3, "#123456");
    const runs = setRangeStyle(coloured, 6, 1, 5, "italic", true);
    expect(runs.find((r) => r.start === 0)).toMatchObject({ color: "#123456" });
    expect(lineSegments("abcdef", 0, runs).map((s) => [s.text, s.color, !!s.italic])).toEqual([["a", "#123456", false], ["bc", "#123456", true], ["de", undefined, true], ["f", undefined, false]]);
  });

  it("removes a colour with null, and drops runs that end up empty", () => {
    const coloured = setRangeColor(undefined, 6, 0, 6, "#abcdef");
    expect(setRangeColor(coloured, 6, 0, 6, null)).toEqual([]);
    expect(setRangeColor(coloured, 6, 2, 4, null)).toEqual([{ start: 0, end: 2, color: "#abcdef" }, { start: 4, end: 6, color: "#abcdef" }]);
  });

  it("ignores a bad colour instead of storing it", () => {
    expect(setRangeColor(undefined, 5, 0, 5, "url(javascript:x)")).toEqual([]);
  });

  it("reads the shared colour of a range", () => {
    const runs = setRangeColor(undefined, 8, 2, 6, "#ff0000");
    expect(rangeColor(runs, 8, 2, 6)).toBe("#ff0000");
    expect(rangeColor(runs, 8, 1, 6)).toBeUndefined();
    expect(rangeColor(runs, 8, 3, 3)).toBeUndefined();
  });

  it("segments split at colour changes and carry the colour", () => {
    const runs = [{ start: 1, end: 3, color: "#ff0000" }];
    expect(lineSegments("abcd", 0, runs)).toEqual([{ text: "a" }, { text: "bc", color: "#ff0000" }, { text: "d" }]);
  });

  it("ignores an unsafe colour read from a file when drawing", () => {
    expect(lineSegments("ab", 0, [{ start: 0, end: 2, color: 'red" onload="x' }])).toEqual([{ text: "ab" }]);
  });
});
