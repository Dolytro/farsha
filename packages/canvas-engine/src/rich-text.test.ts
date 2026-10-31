import { describe, expect, it } from "vitest";
import { adjustRuns, layoutText, lineSegments, rangeHas, setRangeStyle } from "./text";

const base = { characters: "Hello world", fontFamily: "Inter", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: "AUTO" as const, width: 400 };

describe("layout starts", () => {
  it("reports where every line begins in the characters, across hard breaks and soft wraps", () => {
    const hard = layoutText({ ...base, characters: "ab\ncd" });
    expect(hard.lines).toEqual(["ab", "cd"]);
    expect(hard.starts).toEqual([0, 3]);
    const wrapped = layoutText({ ...base, characters: "aaa bbb ccc", width: 30, textAutoResize: "HEIGHT" });
    expect(wrapped.lines.length).toBeGreaterThan(1);
    wrapped.lines.forEach((line, i) => expect("aaa bbb ccc".slice(wrapped.starts[i], wrapped.starts[i]! + line.length)).toBe(line));
  });
  it("counts list markers as sitting just before their paragraph", () => {
    const l = layoutText({ ...base, characters: "ab\ncd", textList: "BULLET" });
    expect(l.lines).toEqual(["• ab", "• cd"]);
    expect(l.starts).toEqual([-2, 1]);
  });
});

describe("lineSegments", () => {
  it("splits a line where the style changes", () => {
    expect(lineSegments("Hello world", 0, [{ start: 6, end: 11, bold: true }])).toEqual([{ text: "Hello " }, { text: "world", bold: true }]);
    expect(lineSegments("world", 6, [{ start: 6, end: 8, italic: true }])).toEqual([{ text: "wo", italic: true }, { text: "rld" }]);
  });
  it("combines overlapping runs and leaves plain lines alone", () => {
    expect(
      lineSegments("abc", 0, [
        { start: 0, end: 2, bold: true },
        { start: 1, end: 3, underline: true },
      ]),
    ).toEqual([{ text: "a", bold: true }, { text: "b", bold: true, underline: true }, { text: "c", underline: true }]);
    expect(lineSegments("abc", 0, undefined)).toEqual([{ text: "abc" }]);
    expect(lineSegments("", 0, [{ start: 0, end: 1, bold: true }])).toEqual([{ text: "" }]);
  });
});

describe("setRangeStyle and rangeHas", () => {
  it("turns a style on for a range and off again, merging neighbours", () => {
    const on = setRangeStyle(undefined, 11, 0, 5, "bold", true);
    expect(on).toEqual([{ start: 0, end: 5, bold: true }]);
    expect(rangeHas(on, 0, 5, "bold")).toBe(true);
    expect(rangeHas(on, 0, 6, "bold")).toBe(false);
    const more = setRangeStyle(on, 11, 5, 8, "bold", true);
    expect(more).toEqual([{ start: 0, end: 8, bold: true }]);
    expect(setRangeStyle(more, 11, 2, 4, "bold", false)).toEqual([
      { start: 0, end: 2, bold: true },
      { start: 4, end: 8, bold: true },
    ]);
    expect(setRangeStyle(on, 11, 0, 5, "bold", false)).toEqual([]);
  });
  it("keeps other styles when one changes", () => {
    const r = setRangeStyle([{ start: 0, end: 4, italic: true }], 6, 2, 6, "bold", true);
    expect(r).toEqual([
      { start: 0, end: 2, italic: true },
      { start: 2, end: 4, bold: true, italic: true },
      { start: 4, end: 6, bold: true },
    ]);
  });
});

describe("adjustRuns", () => {
  const runs = [{ start: 6, end: 11, bold: true }];
  it("moves a run when text is typed before it", () => {
    expect(adjustRuns(runs, "Hello world", "Oh Hello world")).toEqual([{ start: 9, end: 14, bold: true }]);
  });
  it("grows a run when text is typed inside it, and shrinks it when text is deleted", () => {
    expect(adjustRuns(runs, "Hello world", "Hello woXrld")).toEqual([{ start: 6, end: 12, bold: true }]);
    expect(adjustRuns(runs, "Hello world", "Hello wld")).toEqual([{ start: 6, end: 9, bold: true }]);
  });
  it("drops a run whose text is gone", () => {
    expect(adjustRuns(runs, "Hello world", "Hello ")).toEqual([]);
    expect(adjustRuns(undefined, "a", "b")).toBeUndefined();
  });
});
