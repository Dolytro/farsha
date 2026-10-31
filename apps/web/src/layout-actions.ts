import type { DesignDoc } from "@farsha/design-core";
import { unionBox } from "@farsha/canvas-engine";
import type { DesignNode } from "@farsha/types";

const real = (doc: DesignDoc, ids: string[]): DesignNode[] => ids.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n && !!n.parentId && n.type !== "PAGE" && n.type !== "DOCUMENT");

/** Figma's Lock / Unlock aspect ratio for every selected layer. Returns how many layers changed. */
export function setLockAspect(doc: DesignDoc, ids: string[], on: boolean): number {
  const nodes = real(doc, ids);
  if (!nodes.length) return 0;
  doc.stopCapturing();
  for (const n of nodes) doc.setStyle(n.id, { lockAspect: on ? true : null });
  doc.stopCapturing();
  return nodes.length;
}

export type SizeAxis = "width" | "height";

/**
 * "Set width / height to hug contents": an auto layout frame sizes itself to what is inside (HUG on that axis).
 * "Set width / height to fill container": a layer inside an auto layout frame stretches to fill it (FILL). Returns how many layers changed.
 */
export function setSizing(doc: DesignDoc, ids: string[], axis: SizeAxis, mode: "HUG" | "FILL"): number {
  let changed = 0;
  doc.stopCapturing();
  for (const n of real(doc, ids)) {
    if (mode === "HUG") {
      if (n.type !== "FRAME" || (n.layoutMode !== "HORIZONTAL" && n.layoutMode !== "VERTICAL")) continue;
      // the width is the main axis of a row and the cross axis of a column
      const primary = (n.layoutMode === "HORIZONTAL") === (axis === "width");
      doc.setStyle(n.id, primary ? { primarySizing: "HUG" } : { counterSizing: "HUG" });
      changed++;
    } else {
      const parent = n.parentId ? doc.getNode(n.parentId) : undefined;
      if (parent?.type !== "FRAME" || (parent.layoutMode !== "HORIZONTAL" && parent.layoutMode !== "VERTICAL")) continue;
      doc.setStyle(n.id, axis === "width" ? { layoutSizingH: "FILL" } : { layoutSizingV: "FILL" });
      changed++;
    }
  }
  doc.stopCapturing();
  return changed;
}

/** Figma's Resize to fit: each selected frame shrinks or grows to exactly cover its layers; the layers keep their place on the canvas. */
export function resizeToFit(doc: DesignDoc, ids: string[]): number {
  let changed = 0;
  doc.stopCapturing();
  for (const n of real(doc, ids)) {
    if (n.type !== "FRAME" || n.layoutMode) continue;
    const kids = doc.children(n.id).filter((c) => c.visible);
    const box = unionBox(kids.map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height })));
    if (!box || box.width <= 0 || box.height <= 0) continue;
    // move the frame to where its content starts, then pull the layers back by the same amount
    doc.setPosition(n.id, n.x + box.x, n.y + box.y);
    doc.resizeNode(n.id, { width: box.width, height: box.height });
    for (const c of kids) doc.setPosition(c.id, c.x - box.x, c.y - box.y);
    changed++;
  }
  doc.stopCapturing();
  return changed;
}
