import { describe, expect, it } from "vitest";
import { FRAME_PRESETS, presetLabel, presetOf, presetFrameProps } from "./frame-presets";

describe("frame presets", () => {
  it("has the six groups, each with sizes", () => {
    expect([...new Set(FRAME_PRESETS.map((p) => p.group))]).toEqual(["Phone", "Tablet", "Desktop", "Presentation", "Watch", "Paper"]);
    expect(FRAME_PRESETS.every((p) => p.width > 0 && p.height > 0)).toBe(true);
  });
  it("finds the preset of a size and labels it", () => {
    expect(presetOf(393.2, 851.8)?.name).toBe("iPhone 16");
    expect(presetOf(1, 1)).toBeUndefined();
    expect(presetLabel(FRAME_PRESETS[0]!)).toBe("Phone · iPhone Duo, Closed (466 × 678)");
  });
});

describe("presetFrameProps", () => {
  it("centres a frame of the preset size on the point", () => {
    const p = FRAME_PRESETS.find((x) => x.name === "iPhone 16")!;
    expect(presetFrameProps(p, { x: 1000, y: 500 })).toEqual({ name: "iPhone 16", x: 804, y: 74, width: 393, height: 852 });
  });
  it("rounds to whole pixels", () => {
    const p = { group: "Test", name: "Odd", width: 101, height: 51 };
    expect(presetFrameProps(p, { x: 10.4, y: 20.6 })).toMatchObject({ x: -40, y: -5 });
  });
});
