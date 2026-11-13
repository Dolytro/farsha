import { mirrorAboutSelection } from "./flip-multi";
import type { DesignDoc } from "@farsha/design-core";
import { booleanShapes, flattenShapes, offsetShape, outlineStrokeShape, fitBox, unionBox, zoomTo, type BooleanOp, type Viewport } from "@farsha/canvas-engine";
import type { Box, DesignNode } from "@farsha/types";
import { isSection, topLevelFrames } from "./section-actions";
import { nextLayerName } from "./layer-names";

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
  const group = doc.createNode("GROUP", { parentId, props: { name: nextLayerName(doc, "Group"), x: box.x, y: box.y, width: box.width, height: box.height } });
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

/** The viewport at `zoom` with the middle of `box` in the middle of a w x h canvas. */
export function centerOnBox(v: Viewport, zoom: number, box: Box, w: number, h: number): Viewport {
  return { ...v, zoom, x: w / 2 - (box.x + box.width / 2) * zoom, y: h / 2 - (box.y + box.height / 2) * zoom };
}

/**
 * Keyboard zoom (+ / - and the zoom commands). With "Keyboard zooms into selection" on and something selected, the
 * selection ends up in the middle of the canvas; otherwise it zooms about the middle like before.
 */
export function zoomKeyboard(doc: DesignDoc, selection: string[], v: Viewport, zoom: number, intoSelection: boolean): Viewport {
  const next = zoomBy(v, zoom);
  if (!intoSelection) return next;
  const box = unionBox(selection.map((id) => doc.absoluteBox(id)).filter((b): b is Box => !!b));
  if (!box) return next;
  const { w, h } = canvasSize();
  return centerOnBox(v, next.zoom, box, w, h);
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
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n && n.type !== "PAGE" && n.type !== "DOCUMENT");
  // Several layers of one parent flip about the middle of the box round all of them (Figma), so they swap places.
  const parent = nodes[0]?.parentId ? doc.getNode(nodes[0].parentId) : undefined;
  const together = nodes.length > 1 && nodes.every((n) => n.parentId === parent?.id) && !(parent?.type === "FRAME" && (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL"));
  const moved = together ? mirrorAboutSelection(nodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height, rotation: n.rotation })), axis) : [];
  doc.stopCapturing();
  nodes.forEach((n, i) => {
    doc.setStyle(n.id, axis === "x" ? { flipX: !n.flipX } : { flipY: !n.flipY });
    const to = moved[i];
    if (to) {
      doc.setPosition(n.id, to.x, to.y);
      if (n.rotation) doc.rotateNode(n.id, to.rotation);
    }
  });
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
  const frame = doc.createNode("FRAME", { parentId, index: order.indexOf(sorted[0]!.id), props: { name: nextLayerName(doc, "Frame"), x: box.x, y: box.y, width: box.width, height: box.height } });
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

const BOOLEAN_NAMES: Record<BooleanOp, string> = { UNION: "Union", SUBTRACT: "Subtract", INTERSECT: "Intersect", EXCLUDE: "Exclude" };

/**
 * Figma's boolean operations: combine two or more shapes (rectangles, ellipses, pen paths, polygons and stars) into one vector.
 * Subtract removes the upper shapes from the bottom one. The originals are replaced by the result (curves become straight segments).
 * Returns the new selection, or null with the reason in `error`.
 */
export function booleanSelection(doc: DesignDoc, ids: string[], op: BooleanOp): { ids: string[]; error?: string } {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n?.parentId);
  const parentId = nodes[0]?.parentId;
  if (nodes.length < 2 || !parentId || nodes.some((n) => n.parentId !== parentId)) return { ids, error: "Select two or more shapes in the same frame" };
  const order = doc.children(parentId).map((n) => n.id);
  const sorted = [...nodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const result = booleanShapes(doc, sorted.map((n) => n.id), op);
  if (!result) return { ids, error: op === "INTERSECT" ? "The shapes do not overlap, or one is not a shape" : "Boolean operations work on rectangles, ellipses, polygons, stars and pen paths" };
  const origin = parentId === doc.rootId || doc.getNode(parentId)?.type === "PAGE" ? { x: 0, y: 0 } : (doc.absoluteBox(parentId) ?? { x: 0, y: 0 });
  const bottom = sorted[0] as unknown as { fills?: unknown; strokes?: unknown; strokeWidth?: number };
  doc.stopCapturing();
  const id = doc.createNode("VECTOR", {
    parentId,
    index: order.indexOf(sorted[sorted.length - 1]!.id) - sorted.length + 1,
    props: {
      name: BOOLEAN_NAMES[op],
      x: result.box.x - origin.x,
      y: result.box.y - origin.y,
      width: result.box.width,
      height: result.box.height,
      viewBox: `0 0 ${result.box.width} ${result.box.height}`,
      markup: `<path d="${result.d}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>`,
      fills: Array.isArray(bottom.fills) ? bottom.fills : [{ type: "SOLID", color: "#d9d9d9", opacity: 1 }],
      strokes: Array.isArray(bottom.strokes) ? bottom.strokes.slice(0, 1) : [],
      strokeWidth: bottom.strokeWidth ?? 1,
    },
  });
  for (const n of sorted) doc.deleteNode(n.id);
  doc.stopCapturing();
  return { ids: [id] };
}

/** Figma's Flatten: turn the selected shapes (or the shapes inside groups and frames) into a single vector. */
export function flattenSelection(doc: DesignDoc, ids: string[]): { ids: string[]; error?: string } {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n?.parentId);
  const parentId = nodes[0]?.parentId;
  if (!nodes.length || !parentId || nodes.some((n) => n.parentId !== parentId)) return { ids, error: "Select layers in the same frame to flatten" };
  const order = doc.children(parentId).map((n) => n.id);
  const sorted = [...nodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const result = flattenShapes(doc, sorted.map((n) => n.id));
  if (!result) return { ids, error: "Flatten works on rectangles, ellipses, polygons, stars and pen paths" };
  const origin = parentId === doc.rootId || doc.getNode(parentId)?.type === "PAGE" ? { x: 0, y: 0 } : (doc.absoluteBox(parentId) ?? { x: 0, y: 0 });
  const bottom = sorted[0] as unknown as { fills?: unknown; strokes?: unknown; strokeWidth?: number };
  doc.stopCapturing();
  const id = doc.createNode("VECTOR", {
    parentId,
    index: order.indexOf(sorted[sorted.length - 1]!.id) - sorted.length + 1,
    props: {
      name: "Vector",
      x: result.box.x - origin.x,
      y: result.box.y - origin.y,
      width: result.box.width,
      height: result.box.height,
      viewBox: `0 0 ${result.box.width} ${result.box.height}`,
      markup: `<path d="${result.d}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>`,
      fills: Array.isArray(bottom.fills) && bottom.fills.length ? bottom.fills : [{ type: "SOLID", color: "#d9d9d9", opacity: 1 }],
      strokes: Array.isArray(bottom.strokes) ? bottom.strokes.slice(0, 1) : [],
      strokeWidth: bottom.strokeWidth ?? 1,
    },
  });
  for (const n of sorted) doc.deleteNode(n.id);
  doc.stopCapturing();
  return { ids: [id] };
}

/** Figma's Outline stroke: the stroke of each selected shape becomes a filled vector placed above it; the original loses its stroke. */
export function outlineStrokeSelection(doc: DesignDoc, ids: string[]): { ids: string[]; error?: string } {
  const made: string[] = [];
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (!n?.parentId) continue;
    const strokes = "strokes" in n && Array.isArray(n.strokes) ? n.strokes : [];
    const result = strokes.length ? outlineStrokeShape(doc, id) : null;
    if (!result) continue;
    const parentId = n.parentId;
    const origin = parentId === doc.rootId || doc.getNode(parentId)?.type === "PAGE" ? { x: 0, y: 0 } : (doc.absoluteBox(parentId) ?? { x: 0, y: 0 });
    const index = doc.children(parentId).findIndex((c) => c.id === id) + 1;
    made.push(
      doc.createNode("VECTOR", {
        parentId,
        index,
        props: {
          name: `${n.name} outline`,
          x: result.box.x - origin.x,
          y: result.box.y - origin.y,
          width: result.box.width,
          height: result.box.height,
          viewBox: `0 0 ${result.box.width} ${result.box.height}`,
          markup: `<path d="${result.d}" fill-rule="nonzero" vector-effect="non-scaling-stroke"/>`,
          fills: strokes.slice(0, 1),
          strokes: [],
          strokeWidth: 0,
        },
      }),
    );
    doc.setStyle(id, { strokes: [] });
  }
  doc.stopCapturing();
  return made.length ? { ids: made } : { ids, error: "Select a rectangle, ellipse, polygon, star or pen path that has a stroke" };
}

/**
 * Figma's Union / Subtract / Intersect / Exclude selection: the shapes go into a group that draws their combined outline and keeps it
 * in step as the shapes change. Fill and stroke come from the bottom shape. Returns the new selection (the group).
 */
export function booleanGroupSelection(doc: DesignDoc, ids: string[], op: BooleanOp): { ids: string[]; error?: string } {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n?.parentId);
  const parentId = nodes[0]?.parentId;
  if (nodes.length < 2 || !parentId || nodes.some((n) => n.parentId !== parentId)) return { ids, error: "Select two or more shapes in the same frame" };
  const order = doc.children(parentId).map((n) => n.id);
  const sorted = [...nodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  if (!booleanShapes(doc, sorted.map((n) => n.id), op)) return { ids, error: op === "INTERSECT" ? "The shapes do not overlap, or one is not a shape" : "Boolean groups work on rectangles, ellipses, polygons, stars and pen paths" };
  const bottom = sorted[0] as unknown as { fills?: unknown; strokes?: unknown; strokeWidth?: number };
  const [group] = groupSelection(doc, sorted.map((n) => n.id));
  if (!group || doc.getNode(group)?.type !== "GROUP") return { ids, error: "Could not group the shapes" };
  doc.setStyle(group, {
    booleanOp: op,
    fills: (Array.isArray(bottom.fills) && bottom.fills.length ? bottom.fills : [{ type: "SOLID", color: "#d9d9d9", opacity: 1 }]) as never,
    strokes: (Array.isArray(bottom.strokes) ? bottom.strokes : []) as never,
    strokeWidth: bottom.strokeWidth ?? 1,
    name: BOOLEAN_NAMES[op],
  } as never);
  doc.stopCapturing();
  return { ids: [group] };
}

/** The frame a new layer drawn on top of `under` belongs to: `under` itself when it is a frame, else its closest frame ancestor (sections do not count). */
export function nearestFrame(doc: DesignDoc, under: DesignNode | undefined): DesignNode | undefined {
  let cur: DesignNode | undefined = under;
  while (cur && cur.type !== "PAGE" && cur.type !== "DOCUMENT") {
    if (cur.type === "FRAME" && !cur.isSection) return cur;
    cur = cur.parentId ? doc.getNode(cur.parentId) : undefined;
  }
  return undefined;
}

/** The viewport moved so that the layer is in the middle of the canvas, keeping the zoom. */
export function panToLayer(doc: DesignDoc, id: string, v: Viewport): Viewport | undefined {
  const box = doc.absoluteBox(id);
  if (!box) return undefined;
  const { w, h } = canvasSize();
  return { ...v, x: w / 2 - (box.x + box.width / 2) * v.zoom, y: h / 2 - (box.y + box.height / 2) * v.zoom };
}

export function adjacentFrame(doc: DesignDoc, pageId: string, current: string | undefined, direction: 1 | -1): string | undefined {
  const place = (id: string) => doc.absoluteBox(id) ?? { x: 0, y: 0, width: 0, height: 0 };
  const frames = topLevelFrames(doc, pageId)
    .filter((n) => n.visible)
    .sort((a, b) => place(a.id).y - place(b.id).y || place(a.id).x - place(b.id).x);
  if (!frames.length) return undefined;
  // From a nested layer, start from the top-level frame it lives in.
  let top = current ? doc.getNode(current) : undefined;
  while (top && top.parentId && top.parentId !== pageId && !isSection(doc.getNode(top.parentId))) top = doc.getNode(top.parentId);
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

/** Figma's Offset path: replace each selected shape by a vector grown (positive) or shrunk (negative) by `distance` pixels. */
export function offsetSelection(doc: DesignDoc, ids: string[], distance: number): { ids: string[]; error?: string } {
  if (!Number.isFinite(distance) || distance === 0) return { ids, error: "Enter a distance other than 0" };
  const made: string[] = [];
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (!n?.parentId) continue;
    const result = offsetShape(doc, id, distance);
    if (!result) continue;
    const parentId = n.parentId;
    const origin = parentId === doc.rootId || doc.getNode(parentId)?.type === "PAGE" ? { x: 0, y: 0 } : (doc.absoluteBox(parentId) ?? { x: 0, y: 0 });
    const index = doc.children(parentId).findIndex((c) => c.id === id);
    const src = n as unknown as { fills?: unknown; strokes?: unknown; strokeWidth?: number };
    made.push(
      doc.createNode("VECTOR", {
        parentId,
        index,
        props: {
          name: n.name,
          x: result.box.x - origin.x,
          y: result.box.y - origin.y,
          width: result.box.width,
          height: result.box.height,
          viewBox: `0 0 ${result.box.width} ${result.box.height}`,
          markup: `<path d="${result.d}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>`,
          fills: Array.isArray(src.fills) ? src.fills : [{ type: "SOLID", color: "#d9d9d9", opacity: 1 }],
          strokes: Array.isArray(src.strokes) ? src.strokes : [],
          strokeWidth: src.strokeWidth ?? 1,
        },
      }),
    );
    doc.deleteNode(id);
  }
  doc.stopCapturing();
  return made.length ? { ids: made } : { ids, error: "Offset works on closed shapes: rectangles, ellipses, polygons, stars and closed pen paths" };
}
