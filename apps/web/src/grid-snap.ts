import type { Box, LayoutGrid } from "@farsha/types";
import { gridRects } from "@farsha/canvas-engine";

/**
 * The lines layers snap to inside a frame that shows layout grids (Figma): the left and right edge of every column and the
 * top and bottom edge of every row, in the coordinates of the page. Square grids and hidden grids add nothing.
 */
export function gridSnapLines(grids: LayoutGrid[] | undefined, frame: Box): { xs: number[]; ys: number[] } {
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const g of grids ?? []) {
    if (!g.visible) continue;
    if (g.type === "COLUMNS") for (const r of gridRects(g, frame.width, frame.height)) [r.x, r.x + r.width].forEach((x) => xs.add(round(frame.x + x)));
    if (g.type === "ROWS") for (const r of gridRects(g, frame.width, frame.height)) [r.y, r.y + r.height].forEach((y) => ys.add(round(frame.y + y)));
  }
  return { xs: [...xs], ys: [...ys] };
}

const round = (n: number) => Math.round(n * 100) / 100;
