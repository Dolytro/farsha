import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { insertionIndex } from "./auto-layout-reorder";
import { topLevelOf } from "./clipboard";

const inside = (b: { x: number; y: number; width: number; height: number }, p: { x: number; y: number }) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;

function depthOf(doc: DesignDoc, id: string): number {
  let d = 0;
  for (let cur = doc.getNode(id)?.parentId; cur; cur = doc.getNode(cur)?.parentId) d++;
  return d;
}

/** The frame a dragged layer is dropped into: the deepest frame (or section) under the pointer that is not one of the dragged layers or inside them; the page when there is none. */
export function dropParent(doc: DesignDoc, pageId: string, ids: string[], point: { x: number; y: number }): string {
  const dragged = new Set(ids);
  const blocked = (n: DesignNode) => ids.some((id) => id === n.id || doc.isAncestor(id, n.id));
  let best: { id: string; depth: number } | null = null;
  for (const n of doc.descendants(pageId)) {
    if (n.type !== "FRAME" || !n.visible || dragged.has(n.id) || blocked(n)) continue;
    const abs = doc.absoluteBox(n.id);
    if (!abs || !inside(abs, point)) continue;
    const depth = depthOf(doc, n.id);
    if (!best || depth > best.depth) best = { id: n.id, depth };
  }
  return best?.id ?? pageId;
}

/**
 * Dropping dragged layers where the pointer is (Figma): a layer that is let go over another frame moves into it, and one let go over empty
 * canvas moves out to the page. Layers keep their place on the canvas; dropped into an auto layout frame they take the slot under the pointer.
 * Layers inside instances stay where they are. A layer let go inside the frame it came from keeps its parent (an auto layout frame reorders it instead).
 * Returns the ids that changed parent.
 */
export function dropInto(doc: DesignDoc, pageId: string, ids: string[], point: { x: number; y: number }): string[] {
  const tops = topLevelOf(doc, ids).filter((id) => {
    const n = doc.getNode(id) as (DesignNode & { mainId?: string }) | undefined;
    return !!n?.parentId && !n.mainId && !n.locked && n.type !== "PAGE";
  });
  if (!tops.length) return [];
  const target = dropParent(doc, pageId, tops, point);
  const targetNode = doc.getNode(target);
  const targetAbs = targetNode && targetNode.type === "FRAME" ? doc.absoluteBox(target) : { x: 0, y: 0, width: 0, height: 0 };
  const moved: string[] = [];
  for (const id of tops) {
    const node = doc.getNode(id)!;
    if (node.parentId === target) continue;
    // inside an auto layout frame a drag only reorders; the layer leaves it once the pointer does
    const parent = doc.getNode(node.parentId!);
    const parentBox = parent?.type === "FRAME" && parent.layoutMode ? doc.absoluteBox(parent.id) : undefined;
    if (parentBox && inside(parentBox, point)) continue;
    const abs = doc.absoluteBox(id);
    if (!abs) continue;
    try {
      let index: number | undefined;
      if (targetNode?.type === "FRAME" && (targetNode.layoutMode === "HORIZONTAL" || targetNode.layoutMode === "VERTICAL")) {
        const horizontal = targetNode.layoutMode === "HORIZONTAL";
        const others = doc.children(target).filter((c) => c.visible && c.layoutPositioning !== "ABSOLUTE");
        const centres = others.map((c) => {
          const b = doc.absoluteBox(c.id);
          return b ? (horizontal ? b.x + b.width / 2 : b.y + b.height / 2) : 0;
        });
        const slot = insertionIndex(centres, horizontal ? point.x : point.y);
        const before = others[slot];
        index = before ? doc.children(target).findIndex((c) => c.id === before.id) : doc.children(target).length;
      }
      doc.reparentNode(id, target, index);
      doc.setPosition(id, abs.x - targetAbs!.x, abs.y - targetAbs!.y);
      moved.push(id);
    } catch {
      // this kind of frame cannot hold that kind of layer: it stays where it was
    }
  }
  return moved;
}
