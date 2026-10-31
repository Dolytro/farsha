import type { DesignDoc } from "@farsha/design-core";
import { unionBox } from "@farsha/canvas-engine";
import type { Box } from "@farsha/types";

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
export type DistributeAxis = "horizontal" | "vertical";

/** Selected layers that are movable: not locked, and not inside another selected layer. */
function movable(doc: DesignDoc, ids: string[]): string[] {
  return ids.filter((id) => {
    const n = doc.getNode(id);
    return !!n?.parentId && !n.locked && !ids.some((o) => o !== id && doc.isAncestor(o, id));
  });
}

/**
 * Align layers (Figma's Align left / horizontal centers / ... ). Several layers align to their shared bounds;
 * a single layer aligns to its parent frame or group (nothing happens directly on a page). Returns how many moved.
 */
export function alignSelection(doc: DesignDoc, ids: string[], mode: AlignMode): number {
  const list = movable(doc, ids);
  if (!list.length) return 0;
  let target: Box | undefined;
  if (list.length === 1) {
    const parent = doc.getNode(doc.getNode(list[0]!)!.parentId!);
    if (!parent || parent.type === "PAGE" || parent.type === "DOCUMENT") return 0;
    target = doc.absoluteBox(parent.id);
  } else {
    target = unionBox(list.map((id) => doc.absoluteBox(id)).filter((b): b is Box => !!b));
  }
  if (!target) return 0;

  doc.stopCapturing();
  let moved = 0;
  for (const id of list) {
    const b = doc.absoluteBox(id);
    if (!b) continue;
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = target.x - b.x;
    else if (mode === "right") dx = target.x + target.width - (b.x + b.width);
    else if (mode === "hcenter") dx = target.x + target.width / 2 - (b.x + b.width / 2);
    else if (mode === "top") dy = target.y - b.y;
    else if (mode === "bottom") dy = target.y + target.height - (b.y + b.height);
    else dy = target.y + target.height / 2 - (b.y + b.height / 2);
    if (dx || dy) {
      doc.moveNode(id, dx, dy);
      moved++;
    }
  }
  doc.stopCapturing();
  return moved;
}

/** Even out the gaps between three or more layers, keeping the outermost two where they are. */
export function distributeSelection(doc: DesignDoc, ids: string[], axis: DistributeAxis): number {
  const list = movable(doc, ids);
  if (list.length < 3) return 0;
  const horizontal = axis === "horizontal";
  const items = list
    .map((id) => ({ id, box: doc.absoluteBox(id)! }))
    .filter((i) => i.box)
    .sort((a, b) => (horizontal ? a.box.x - b.box.x : a.box.y - b.box.y));
  const size = (b: Box) => (horizontal ? b.width : b.height);
  const start = (b: Box) => (horizontal ? b.x : b.y);
  const first = items[0]!.box;
  const last = items[items.length - 1]!.box;
  const span = start(last) + size(last) - start(first);
  const gap = (span - items.reduce((sum, i) => sum + size(i.box), 0)) / (items.length - 1);

  doc.stopCapturing();
  let moved = 0;
  let cursor = start(first) + size(first) + gap;
  for (const item of items.slice(1, -1)) {
    const d = cursor - start(item.box);
    if (Math.abs(d) > 1e-9) {
      doc.moveNode(item.id, horizontal ? d : 0, horizontal ? 0 : d);
      moved++;
    }
    cursor += size(item.box) + gap;
  }
  doc.stopCapturing();
  return moved;
}
