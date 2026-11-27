import { describe, expect, it } from "vitest";
import { clampPanelWidth, parsePanelWidth } from "./panel-width";

describe("clampPanelWidth", () => {
  it("keeps a width between 200 and 480", () => {
    expect(clampPanelWidth(100)).toBe(200);
    expect(clampPanelWidth(300)).toBe(300);
    expect(clampPanelWidth(900)).toBe(480);
  });
  it("rounds and survives nonsense", () => {
    expect(clampPanelWidth(264.6)).toBe(265);
    expect(clampPanelWidth(Number.NaN)).toBe(200);
  });
  it("never takes more than 40% of a small window", () => {
    expect(clampPanelWidth(480, 800)).toBe(320);
    expect(clampPanelWidth(480, 300)).toBe(200);
  });
});

describe("parsePanelWidth", () => {
  it("reads saved values and ignores junk", () => {
    expect(parsePanelWidth("320")).toBe(320);
    expect(parsePanelWidth("9999")).toBe(480);
    expect(parsePanelWidth("abc")).toBeNull();
    expect(parsePanelWidth("")).toBeNull();
    expect(parsePanelWidth(null)).toBeNull();
  });
});
