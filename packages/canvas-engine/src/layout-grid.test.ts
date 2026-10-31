import { describe, expect, it } from "vitest";
import type { LayoutGrid } from "@farsha/types";
import { gridRects, tracks } from "./layout-grid";

const grid = (g: Partial<LayoutGrid>): LayoutGrid => ({ type: "COLUMNS", count: 4, gutter: 20, margin: 20, color: "#ff0000", opacity: 0.1, visible: true, ...g });

describe("tracks", () => {
  it("splits the length into equal tracks with gutters inside the margins", () => {
    // 400 - 2 * 20 margin = 360; 4 tracks with 3 gutters of 20 -> (360 - 60) / 4 = 75
    expect(tracks(400, 4, 20, 20)).toEqual([[20, 75], [115, 75], [210, 75], [305, 75]]);
  });
  it("gives nothing when the margins and gutters leave no room", () => {
    expect(tracks(100, 4, 40, 20)).toEqual([]);
  });
  it("keeps at least one track", () => expect(tracks(100, 0, 0, 0)).toEqual([[0, 100]]));
});

describe("gridRects", () => {
  it("columns run the full height", () => {
    const r = gridRects(grid({}), 400, 300);
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual({ x: 20, y: 0, width: 75, height: 300 });
  });
  it("rows run the full width", () => {
    const r = gridRects(grid({ type: "ROWS", count: 2, gutter: 0, margin: 0 }), 400, 300);
    expect(r).toEqual([
      { x: 0, y: 0, width: 400, height: 150 },
      { x: 0, y: 150, width: 400, height: 150 },
    ]);
  });
  it("a square grid draws lines every size pixels", () => {
    const r = gridRects(grid({ type: "GRID", size: 100 }), 200, 100);
    expect(r.filter((l) => l.width === 1)).toHaveLength(3); // x = 0, 100, 200
    expect(r.filter((l) => l.height === 1)).toHaveLength(2); // y = 0, 100
  });
  it("caps the number of lines", () => {
    const r = gridRects(grid({ type: "GRID", size: 2 }), 100000, 100000);
    expect(r.length).toBeLessThanOrEqual(1000);
  });
  it("copes with missing numbers", () => {
    expect(gridRects({ type: "COLUMNS", color: "#000", opacity: 1, visible: true } as LayoutGrid, 400, 100).length).toBe(4);
  });
});
