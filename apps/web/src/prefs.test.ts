import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, parsePrefs, PINCH_STRENGTH, WHEEL_STRENGTH, wheelZoomFactor } from "./prefs";

describe("parsePrefs", () => {
  it("uses the defaults when nothing is saved or the value is damaged", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("42")).toEqual(DEFAULT_PREFS);
  });
  it("keeps valid values and replaces invalid ones one by one", () => {
    const p = parsePrefs(JSON.stringify({ keepTool: true, snapping: "yes", nudge: 2, bigNudge: -5, wheelZoom: true }));
    expect(p).toMatchObject({ keepTool: true, snapping: true, nudge: 2, bigNudge: 10, wheelZoom: true, invertZoom: false });
  });
  it("rejects absurd nudge amounts", () => expect(parsePrefs(JSON.stringify({ nudge: 1e9 })).nudge).toBe(1));
});

describe("wheelZoomFactor", () => {
  it("zooms in on negative deltas and reverses when inverted", () => {
    expect(wheelZoomFactor(-100, false)).toBeGreaterThan(1);
    expect(wheelZoomFactor(-100, true)).toBeLessThan(1);
    expect(wheelZoomFactor(0, false)).toBe(1);
  });
});

describe("wheel strength", () => {
  it("a plain wheel notch zooms gently compared with a pinch step", () => {
    expect(wheelZoomFactor(-100, false, WHEEL_STRENGTH)).toBeLessThan(1.2);
    expect(wheelZoomFactor(-100, false, PINCH_STRENGTH)).toBeGreaterThan(2);
  });
});
