import type { LayoutGrid } from "@canvylo/types";

export interface GridRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const n = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Columns or rows laid across `length` pixels (Figma's stretch alignment): equal tracks separated by gutters, inside the margins. */
export function tracks(length: number, count: number, gutter: number, margin: number): [number, number][] {
  const c = Math.max(1, Math.min(200, Math.round(count)));
  const g = Math.max(0, gutter);
  const inner = length - 2 * Math.max(0, margin);
  const size = (inner - g * (c - 1)) / c;
  if (size <= 0) return [];
  return Array.from({ length: c }, (_, i) => [Math.max(0, margin) + i * (size + g), size] as [number, number]);
}

/** The shaded areas (columns / rows) or lines (a square grid) a layout grid draws inside a frame of the given size. */
export function gridRects(grid: LayoutGrid, width: number, height: number): GridRect[] {
  if (grid.type === "COLUMNS") {
    return tracks(width, n(grid.count, 4), n(grid.gutter, 20), n(grid.margin, 0)).map(([x, w]) => ({ x, y: 0, width: w, height }));
  }
  if (grid.type === "ROWS") {
    return tracks(height, n(grid.count, 4), n(grid.gutter, 20), n(grid.margin, 0)).map(([y, h]) => ({ x: 0, y, width, height: h }));
  }
  // GRID: one-pixel lines every `size` pixels, capped so a tiny size can't create thousands of elements
  const size = Math.max(2, n(grid.size, 10));
  const out: GridRect[] = [];
  for (let x = 0, i = 0; x <= width && i < 500; x += size, i++) out.push({ x, y: 0, width: 1, height });
  for (let y = 0, i = 0; y <= height && i < 500; y += size, i++) out.push({ x: 0, y, width: width, height: 1 });
  return out;
}
