import type { DesignDoc } from "@farsha/design-core";
import type { Box, DesignNode } from "@farsha/types";

export type Bounds = Box;

export const contains = (b: Bounds, px: number, py: number) =>
  px >= b.x && py >= b.y && px <= b.x + b.width && py <= b.y + b.height;

/**
 * Topmost visible, unlocked node under a world point. Coordinates are
 * relative to the page (no nested transforms yet), children before parents.
 * Like Figma, a click on something inside a group picks the whole (outermost) group; pass `deep`
 * to get the innermost layer instead (used to enter a group with a double click).
 */
export function hitTest(doc: DesignDoc, pageId: string, wx: number, wy: number, deep = false): DesignNode | undefined {
  const hit = deepestHit(doc, pageId, wx, wy);
  if (!hit || deep) return hit;
  let group: DesignNode | undefined;
  for (let cur: DesignNode | undefined = hit; cur && cur.type !== "PAGE"; cur = cur.parentId ? doc.getNode(cur.parentId) : undefined) {
    if (cur.type === "GROUP") group = cur;
  }
  return group ?? hit;
}

/** The box a click can land in: very thin layers (lines) get a few pixels of slack so they can be picked. */
function pickBox(b: Bounds): Bounds {
  const padX = b.width < 6 ? (6 - b.width) / 2 : 0;
  const padY = b.height < 6 ? (6 - b.height) / 2 : 0;
  return { x: b.x - padX, y: b.y - padY, width: b.width + padX * 2, height: b.height + padY * 2 };
}

/** A world point mapped into the unrotated frame of a layer that is rotated around its centre. */
function localPoint(b: Bounds, rotation: number, wx: number, wy: number): [number, number] {
  if (!rotation) return [wx, wy];
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const rad = (-rotation * Math.PI) / 180;
  const dx = wx - cx;
  const dy = wy - cy;
  return [cx + dx * Math.cos(rad) - dy * Math.sin(rad), cy + dx * Math.sin(rad) + dy * Math.cos(rad)];
}

function deepestHit(doc: DesignDoc, pageId: string, wx: number, wy: number): DesignNode | undefined {
  const walk = (parentId: string, ox: number, oy: number): DesignNode | undefined => {
    const kids = doc.paintOrder(parentId);
    for (let i = kids.length - 1; i >= 0; i--) {
      const n = kids[i]!;
      if (!n.visible || n.locked) continue;
      const abs = { x: ox + n.x, y: oy + n.y, width: n.width, height: n.height };
      const inner = walk(n.id, abs.x, abs.y);
      if (inner) return inner;
      if (contains(pickBox(abs), ...localPoint(abs, n.rotation, wx, wy))) return n;
    }
    return undefined;
  };
  return walk(pageId, 0, 0);
}

/**
 * Every visible, unlocked layer under a world point, topmost first (a layer comes after the layers inside it).
 * Used by the right-click "Select layer" list.
 */
export function hitTestAll(doc: DesignDoc, pageId: string, wx: number, wy: number): DesignNode[] {
  const out: DesignNode[] = [];
  const walk = (parentId: string, ox: number, oy: number) => {
    const kids = doc.paintOrder(parentId);
    for (let i = kids.length - 1; i >= 0; i--) {
      const n = kids[i]!;
      if (!n.visible || n.locked) continue;
      const abs = { x: ox + n.x, y: oy + n.y, width: n.width, height: n.height };
      walk(n.id, abs.x, abs.y);
      if (contains(pickBox(abs), ...localPoint(abs, n.rotation, wx, wy))) out.push(n);
    }
  };
  walk(pageId, 0, 0);
  return out;
}

/** Absolute (page-space) bounds of a node. */
export function absoluteBounds(doc: DesignDoc, id: string): Bounds | undefined {
  return doc.absoluteBox(id);
}
