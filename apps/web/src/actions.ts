import type { DesignDoc } from "@canvylo/design-core";
import { fitBox, unionBox, zoomTo, type Viewport } from "@canvylo/canvas-engine";
import type { Box } from "@canvylo/types";

/** Group selected siblings under a new GROUP (Ctrl+G). Returns the new selection. */
export function groupSelection(doc: DesignDoc, ids: string[]): string[] {
  const picked = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n?.parentId);
  const parentId = picked[0]?.parentId;
  if (!parentId || picked.some((n) => n.parentId !== parentId)) return ids;
  // keep the layers in their current stacking order, whatever order they were selected in
  const order = doc.children(parentId).map((n) => n.id);
  const nodes = [...picked].sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  const box = unionBox(nodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })))!;
  doc.stopCapturing();
  const group = doc.createNode("GROUP", { parentId, props: { x: box.x, y: box.y, width: box.width, height: box.height } });
  for (const n of nodes) {
    doc.reparentNode(n.id, group);
    doc.setPosition(n.id, n.x - box.x, n.y - box.y);
  }
  doc.stopCapturing();
  return [group];
}

/** Move a group's children up to its parent and remove the group (Ctrl+Shift+G). */
export function ungroupSelection(doc: DesignDoc, ids: string[]): string[] {
  const out: string[] = [];
  doc.stopCapturing();
  for (const id of ids) {
    const g = doc.getNode(id);
    if (g?.type !== "GROUP" || !g.parentId) {
      out.push(id);
      continue;
    }
    const at = doc.children(g.parentId).findIndex((n) => n.id === id);
    doc.children(id).forEach((c, i) => {
      doc.reparentNode(c.id, g.parentId!, at + i);
      doc.setPosition(c.id, c.x + g.x, c.y + g.y);
      out.push(c.id);
    });
    doc.deleteNode(id);
  }
  doc.stopCapturing();
  return out;
}

/** Change z-order: step is +1 / -1, or +Infinity / -Infinity for front / back. */
export function reorderSelection(doc: DesignDoc, ids: string[], step: number): void {
  doc.stopCapturing();
  const ordered = [...ids].sort((a, b) => {
    const ka = doc.getNode(a)?.orderKey ?? "";
    const kb = doc.getNode(b)?.orderKey ?? "";
    return step > 0 ? (ka < kb ? 1 : -1) : ka < kb ? -1 : 1;
  });
  for (const id of ordered) {
    const n = doc.getNode(id);
    if (!n?.parentId) continue;
    const index = doc.children(n.parentId).findIndex((c) => c.id === id);
    const target = Number.isFinite(step) ? index + step : step > 0 ? Number.MAX_SAFE_INTEGER : 0;
    doc.reorderNode(id, Math.max(0, target));
  }
  doc.stopCapturing();
}

function canvasSize(): { w: number; h: number } {
  const r = document.querySelector(".canvas")?.getBoundingClientRect();
  return { w: r?.width ?? 800, h: r?.height ?? 600 };
}

export function zoomFit(doc: DesignDoc, pageId: string, selection: string[]): Viewport | undefined {
  const boxes = (selection.length ? selection : doc.children(pageId).map((n) => n.id))
    .map((id) => doc.absoluteBox(id))
    .filter((b): b is Box => !!b);
  const box = unionBox(boxes);
  if (!box) return undefined;
  const { w, h } = canvasSize();
  return fitBox(box, w, h);
}

/** Page coordinates of the middle of the visible canvas. */
export function viewportCenter(v: Viewport): { x: number; y: number } {
  const { w, h } = canvasSize();
  return { x: (w / 2 - v.x) / v.zoom, y: (h / 2 - v.y) / v.zoom };
}

export function zoomBy(v: Viewport, zoom: number): Viewport {
  const { w, h } = canvasSize();
  return zoomTo(v, zoom, w, h);
}

/** Hide or show the layers; if any is visible they all get hidden (Figma's Ctrl+Shift+H). */
export function toggleHidden(doc: DesignDoc, ids: string[]): void {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n);
  const hide = nodes.some((n) => n.visible);
  doc.stopCapturing();
  nodes.forEach((n) => doc.setStyle(n.id, { visible: !hide }));
  doc.stopCapturing();
}

/** Lock or unlock the layers; if any is unlocked they all get locked (Figma's Ctrl+Shift+L). */
export function toggleLocked(doc: DesignDoc, ids: string[]): void {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n);
  const lock = nodes.some((n) => !n.locked);
  doc.stopCapturing();
  nodes.forEach((n) => doc.setStyle(n.id, { locked: lock }));
  doc.stopCapturing();
}

/** Figma's Flip horizontal / vertical (Shift+H / Shift+V): each selected layer is mirrored about its own centre. */
export function flipSelection(doc: DesignDoc, ids: string[], axis: "x" | "y"): void {
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (!n || n.type === "PAGE" || n.type === "DOCUMENT") continue;
    doc.setStyle(id, axis === "x" ? { flipX: !n.flipX } : { flipY: !n.flipY });
  }
  doc.stopCapturing();
}

/** Figma's "Frame selection" (Ctrl+Alt+G): wrap sibling layers in a new frame the size of their bounds. */
export function frameSelection(doc: DesignDoc, ids: string[]): string[] {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n?.parentId);
  const parentId = nodes[0]?.parentId;
  if (!parentId || nodes.some((n) => n.parentId !== parentId)) return ids;
  const box = unionBox(nodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })))!;
  const order = doc.children(parentId).map((n) => n.id);
  const sorted = [...nodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  doc.stopCapturing();
  const frame = doc.createNode("FRAME", { parentId, index: order.indexOf(sorted[0]!.id), props: { x: box.x, y: box.y, width: box.width, height: box.height } });
  for (const n of sorted) {
    doc.reparentNode(n.id, frame);
    doc.setPosition(n.id, n.x - box.x, n.y - box.y);
  }
  doc.stopCapturing();
  return [frame];
}

/** Figma's N / Shift+N: the next (or previous) top-level frame of the page in reading order (top to bottom, then left to right), wrapping around. */
/** Figma's "Layout grids" (Shift+G): show the grids of the selected frames, or hide them when they are all showing. */
export function toggleLayoutGrids(doc: DesignDoc, ids: string[]): number {
  const frames = ids.map((id) => doc.getNode(id)).filter((n): n is Extract<NonNullable<ReturnType<DesignDoc["getNode"]>>, { type: "FRAME" }> => n?.type === "FRAME" && !!n.layoutGrids?.length);
  if (!frames.length) return 0;
  const allShown = frames.every((f) => f.layoutGrids!.every((g) => g.visible));
  doc.stopCapturing();
  for (const f of frames) doc.setStyle(f.id, { layoutGrids: f.layoutGrids!.map((g) => ({ ...g, visible: !allShown })) });
  doc.stopCapturing();
  return frames.length;
}

export function adjacentFrame(doc: DesignDoc, pageId: string, current: string | undefined, direction: 1 | -1): string | undefined {
  const frames = doc
    .children(pageId)
    .filter((n) => n.type === "FRAME" && n.visible)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (!frames.length) return undefined;
  // From a nested layer, start from the top-level frame it lives in.
  let top = current ? doc.getNode(current) : undefined;
  while (top && top.parentId && top.parentId !== pageId) top = doc.getNode(top.parentId);
  const at = top ? frames.findIndex((f) => f.id === top!.id) : -1;
  const next = at < 0 ? (direction === 1 ? 0 : frames.length - 1) : (at + direction + frames.length) % frames.length;
  return frames[next]!.id;
}

/**
 * Figma's "Use as mask" (Ctrl+Alt+M). One layer: it masks the layers above it in the same parent (or stops doing so when it
 * already is a mask). Several layers: they are grouped and the bottom-most one becomes the mask.
 */
export function useAsMask(doc: DesignDoc, ids: string[]): string[] {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n?.parentId);
  if (!nodes.length) return ids;
  doc.stopCapturing();
  if (nodes.length === 1) {
    doc.setStyle(nodes[0]!.id, { isMask: !nodes[0]!.isMask });
    doc.stopCapturing();
    return ids;
  }
  const [group] = groupSelection(doc, ids);
  const bottom = group ? doc.children(group)[0] : undefined;
  if (group && doc.getNode(group)?.type === "GROUP" && bottom) doc.setStyle(bottom.id, { isMask: true });
  doc.stopCapturing();
  return group ? [group] : ids;
}
