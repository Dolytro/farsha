import type { Box } from "@farsha/types";

export interface GroupItem extends Box {
  id: string;
}

/** The box that holds all the items. */
export function groupBox(items: GroupItem[]): Box | null {
  if (!items.length) return null;
  const x1 = Math.min(...items.map((i) => i.x));
  const y1 = Math.min(...items.map((i) => i.y));
  const x2 = Math.max(...items.map((i) => i.x + i.width));
  const y2 = Math.max(...items.map((i) => i.y + i.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Resizing several layers at once (Figma): the box around them goes from `from` to `to`, and every layer keeps its place and size
 * relative to that box, so positions and sizes both scale. Sizes never drop below 1.
 */
export function resizeGroup(items: GroupItem[], from: Box, to: Box): Record<string, Box> {
  const sx = from.width > 0 ? to.width / from.width : 1;
  const sy = from.height > 0 ? to.height / from.height : 1;
  const round = (v: number) => Math.round(v * 100) / 100;
  const out: Record<string, Box> = {};
  for (const i of items) {
    out[i.id] = {
      x: round(to.x + (i.x - from.x) * sx),
      y: round(to.y + (i.y - from.y) * sy),
      width: Math.max(1, round(i.width * sx)),
      height: Math.max(1, round(i.height * sy)),
    };
  }
  return out;
}

export interface TurnItem extends GroupItem {
  rotation: number;
}

/**
 * Turning several layers together (Figma): every layer swings round the middle of the box that holds them by `degrees`
 * and also turns by that much itself, so the group keeps its shape. Returns the new position and rotation of each layer.
 */
export function rotateGroup(items: TurnItem[], degrees: number): Record<string, { x: number; y: number; rotation: number }> {
  const box = groupBox(items);
  if (!box) return {};
  const gx = box.x + box.width / 2;
  const gy = box.y + box.height / 2;
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const round = (v: number) => Math.round(v * 100) / 100;
  const out: Record<string, { x: number; y: number; rotation: number }> = {};
  for (const i of items) {
    const cx = i.x + i.width / 2 - gx;
    const cy = i.y + i.height / 2 - gy;
    const nx = gx + cx * cos - cy * sin;
    const ny = gy + cx * sin + cy * cos;
    out[i.id] = { x: round(nx - i.width / 2), y: round(ny - i.height / 2), rotation: round(((i.rotation + degrees) % 360 + 360) % 360) };
  }
  return out;
}
