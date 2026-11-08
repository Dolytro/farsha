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
    expect(p).toMatchObject({ spellCheck: false, keepTool: true, snapping: true, nudge: 2, bigNudge: 10, wheelZoom: true, invertZoom: false });
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

describe("ui presets", () => {
  it("defaults to farsha and rejects unknown presets", async () => {
    const { parsePreset, UI_PRESETS } = await import("./prefs");
    expect(parsePreset(undefined)).toBe("farsha");
    expect(parsePreset("neon")).toBe("farsha");
    expect(parsePreset("compact")).toBe("compact");
    expect(UI_PRESETS.map((p) => p.id)).toEqual(["farsha", "figma", "compact", "comfortable", "contrast"]);
  });
  it("is saved with the other preferences", () => {
    expect(parsePrefs(JSON.stringify({ preset: "contrast" })).preset).toBe("contrast");
    expect(parsePrefs(JSON.stringify({ preset: 5 })).preset).toBe("farsha");
  });
});

describe("canvas preferences", () => {
  it("default to the Figma behaviour and read booleans only", () => {
    expect(parsePrefs(null)).toMatchObject({ hoverHighlight: true, showDimensions: true, rightDragPan: false });
    expect(parsePrefs(JSON.stringify({ hoverHighlight: false, showDimensions: "no", rightDragPan: true }))).toMatchObject({ hoverHighlight: false, showDimensions: true, rightDragPan: true });
  });
});

describe("newer preferences", () => {
  it("defaults: flip while resizing on, the rest off", () => {
    const p = parsePrefs(null);
    expect(p.flipWhileResizing).toBe(true);
    expect([p.hideUiWhileChanging, p.arrowRotate, p.smartQuotes]).toEqual([false, false, false]);
  });
  it("reads them back and ignores bad values", () => {
    const p = parsePrefs(JSON.stringify({ flipWhileResizing: false, hideUiWhileChanging: true, arrowRotate: "yes" }));
    expect([p.flipWhileResizing, p.hideUiWhileChanging, p.arrowRotate]).toEqual([false, true, false]);
  });
});

describe("reduce motion preference", () => {
  it("is off by default and read from saved preferences", () => {
    expect(parsePrefs(null).reduceMotion).toBe(false);
    expect(parsePrefs(JSON.stringify({ reduceMotion: true })).reduceMotion).toBe(true);
    expect(parsePrefs(JSON.stringify({ reduceMotion: "yes" })).reduceMotion).toBe(false);
  });
});

describe("snap to pixel grid preference", () => {
  it("is on by default and can be switched off", () => {
    expect(parsePrefs(null).pixelSnap).toBe(true);
    expect(parsePrefs(JSON.stringify({ pixelSnap: false })).pixelSnap).toBe(false);
    expect(parsePrefs(JSON.stringify({ pixelSnap: "no" })).pixelSnap).toBe(true);
  });
});
