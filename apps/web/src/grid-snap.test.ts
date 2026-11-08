import { describe, expect, it } from "vitest";
import { gridSnapLines } from "./grid-snap";

const frame = { x: 100, y: 50, width: 400, height: 300 };

describe("gridSnapLines", () => {
  it("gives column edges in page coordinates", () => {
    const { xs, ys } = gridSnapLines([{ type: "COLUMNS", count: 2, gutter: 20, margin: 10, color: "#f00", opacity: 0.1, visible: true }], frame);
    expect(xs).toEqual([110, 290, 310, 490]);
    expect(ys).toEqual([]);
  });
  it("gives row edges", () => {
    const { xs, ys } = gridSnapLines([{ type: "ROWS", count: 3, gutter: 0, margin: 0, color: "#f00", opacity: 0.1, visible: true }], frame);
    expect(xs).toEqual([]);
    expect(ys).toEqual([50, 150, 250, 350]);
  });
  it("gives a line per cell for a square grid", () => {
    const { xs, ys } = gridSnapLines([{ type: "GRID", size: 100, color: "#f00", opacity: 0.1, visible: true }], frame);
    expect(xs).toEqual([100, 200, 300, 400, 500]);
    expect(ys).toEqual([50, 150, 250, 350]);
  });
  it("skips a square grid with tiny cells", () => {
    expect(gridSnapLines([{ type: "GRID", size: 2, color: "#f00", opacity: 0.1, visible: true }], { x: 0, y: 0, width: 4000, height: 10 }).xs).toEqual([]);
  });
  it("ignores hidden grids and no grids", () => {
    expect(gridSnapLines([{ type: "COLUMNS", count: 2, color: "#f00", opacity: 0.1, visible: false }], frame)).toEqual({ xs: [], ys: [] });
    expect(gridSnapLines(undefined, frame)).toEqual({ xs: [], ys: [] });
  });
});
