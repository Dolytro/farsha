import type { DesignDoc } from "@canvylo/design-core";
import type { Box, DesignNode } from "@canvylo/types";

export type Bounds = Box;

export const contains = (b: Bounds, px: number, py: number) =>
  px >= b.x && py >= b.y && px <= b.x + b.width && py <= b.y + b.height;

/**
 * Topmost visible, unlocked node under a world point. Coordinates are
 * relative to the page (no nested transforms yet), children before parents.
 */
export function hitTest(doc: DesignDoc, pageId: string, wx: number, wy: number): DesignNode | undefined {
  const walk = (parentId: string, ox: number, oy: number): DesignNode | undefined => {
    const kids = doc.children(parentId);
    for (let i = kids.length - 1; i >= 0; i--) {
      const n = kids[i]!;
      if (!n.visible || n.locked) continue;
      const abs = { x: ox + n.x, y: oy + n.y, width: n.width, height: n.height };
      const inner = walk(n.id, abs.x, abs.y);
      if (inner) return inner;
      if (contains(abs, wx, wy)) return n;
    }
    return undefined;
  };
  return walk(pageId, 0, 0);
}

/** Absolute (page-space) bounds of a node. */
export function absoluteBounds(doc: DesignDoc, id: string): Bounds | undefined {
  return doc.absoluteBox(id);
}
