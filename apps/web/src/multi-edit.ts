import type { DesignDoc } from "@farsha/design-core";
import type { Box, DesignNode } from "@farsha/types";
import { groupBox, resizeGroup } from "./multi-resize";

/** The value every item has, or null when they differ (the panel then shows "Mixed") or there are no items. */
export function commonValue<T>(values: T[]): T | null {
  if (!values.length) return null;
  const first = values[0]!;
  return values.every((v) => v === first) ? first : null;
}

export interface SelectionFrame {
  box: Box;
  /** True when every layer has the same parent: the box is then in that parent's coordinates and can be resized, otherwise it is on the canvas and can only be moved. */
  sameParent: boolean;
}

const nodesOf = (doc: DesignDoc, ids: string[]): DesignNode[] => ids.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n);

/** The box that holds the selected layers, as the Design panel shows it for several layers. */
export function selectionFrame(doc: DesignDoc, ids: string[]): SelectionFrame | null {
  const nodes = nodesOf(doc, ids);
  if (nodes.length < 2) return null;
  const sameParent = new Set(nodes.map((n) => n.parentId)).size === 1;
  const box = sameParent
    ? groupBox(nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height })))
    : groupBox(nodes.map((n) => ({ id: n.id, ...(doc.absoluteBox(n.id) ?? { x: n.x, y: n.y, width: n.width, height: n.height }) })));
  return box ? { box, sameParent } : null;
}

/**
 * Edit the box of several layers (what the X / Y / W / H fields do): the layers move together, and when they share a parent a new size
 * scales them together too (each keeps its place in the box). Returns the ids that were changed.
 */
export function setSelectionBox(doc: DesignDoc, ids: string[], patch: Partial<Box>): string[] {
  const frame = selectionFrame(doc, ids);
  if (!frame) return [];
  const to: Box = { ...frame.box, ...patch };
  to.width = Math.max(1, to.width);
  to.height = Math.max(1, to.height);
  const nodes = nodesOf(doc, ids).filter((n) => !n.locked);
  doc.stopCapturing();
  if (frame.sameParent) {
    const items = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height }));
    const next = resizeGroup(items, frame.box, to);
    for (const [id, box] of Object.entries(next)) doc.resizeNode(id, box);
  } else {
    const dx = to.x - frame.box.x;
    const dy = to.y - frame.box.y;
    for (const n of nodes) doc.moveNode(n.id, dx, dy);
  }
  doc.stopCapturing();
  return nodes.map((n) => n.id);
}

/** Set the same style values on every selected layer that can have them (a layer without that property is skipped). */
export function setCommonStyle(doc: DesignDoc, ids: string[], key: string, value: unknown): string[] {
  const done: string[] = [];
  doc.stopCapturing();
  for (const n of nodesOf(doc, ids)) {
    if (n.locked || !(key in n)) continue;
    doc.setStyle(n.id, { [key]: value } as never);
    done.push(n.id);
  }
  doc.stopCapturing();
  return done;
}
