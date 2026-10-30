import { describe, expect, it } from "vitest";
import { showPixelGrid, visibleWorld } from "./pixel-grid";

describe("pixel grid", () => {
  it("shows only when enabled and zoomed in far enough", () => {
    expect(showPixelGrid(true, 8)).toBe(true);
    expect(showPixelGrid(true, 4)).toBe(false);
    expect(showPixelGrid(false, 16)).toBe(false);
  });
  it("covers the visible part of the page", () => {
    // viewport panned so page x = 10 is at the left edge, 10x zoom, 100 x 50 px window
    const w = visibleWorld({ x: -100, y: -20, zoom: 10 }, 100, 50);
    expect(w.x).toBe(9);
    expect(w.y).toBe(1);
    expect(w.width).toBeGreaterThanOrEqual(10);
    expect(w.height).toBeGreaterThanOrEqual(5);
  });
});
