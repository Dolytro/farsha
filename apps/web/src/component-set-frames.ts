import type { DesignDoc } from "@farsha/design-core";
import type { Box } from "@farsha/types";

export interface ComponentSetFrame {
  setId: string;
  name: string;
  count: number;
  box: Box;
}

export const SET_PADDING = 16;

/** The dashed box Figma draws round the variants of a component set: one per set on the page, a little bigger than the variants it holds. */
export function componentSetFrames(doc: DesignDoc, pageId: string): ComponentSetFrame[] {
  const sets = new Map<string, { name: string; boxes: Box[] }>();
  for (const n of doc.descendants(pageId)) {
    if (n.type !== "FRAME" || !n.isComponent || !n.componentSetId || !n.visible) continue;
    const abs = doc.absoluteBox(n.id);
    if (!abs) continue;
    const entry = sets.get(n.componentSetId) ?? { name: n.name, boxes: [] };
    entry.boxes.push(abs);
    sets.set(n.componentSetId, entry);
  }
  return [...sets.entries()]
    .filter(([, s]) => s.boxes.length > 1)
    .map(([setId, s]) => {
      const x1 = Math.min(...s.boxes.map((b) => b.x));
      const y1 = Math.min(...s.boxes.map((b) => b.y));
      const x2 = Math.max(...s.boxes.map((b) => b.x + b.width));
      const y2 = Math.max(...s.boxes.map((b) => b.y + b.height));
      return { setId, name: s.name, count: s.boxes.length, box: { x: x1 - SET_PADDING, y: y1 - SET_PADDING, width: x2 - x1 + SET_PADDING * 2, height: y2 - y1 + SET_PADDING * 2 } };
    });
}
