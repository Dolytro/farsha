import type { DesignDoc } from "@farsha/design-core";
import { joinPenPaths, penGeometry, scalePoints, simplifyPenPoints, smoothPenPoints, splitPenPoints, translatePoints, type PenPoint } from "@farsha/canvas-engine";

interface PenLayer {
  id: string;
  parentId: string;
  x: number;
  y: number;
  points: PenPoint[];
  closed: boolean;
}

/** Selected pen paths with their points in the layer's own coordinates (a resize since the last edit is applied to them). */
function penLayers(doc: DesignDoc, ids: string[]): PenLayer[] {
  const out: PenLayer[] = [];
  for (const id of ids) {
    const n = doc.getNode(id);
    if (n?.type !== "VECTOR" || !n.penPoints || n.penPoints.length < 2 || !n.parentId || n.rotation || n.flipX || n.flipY) continue;
    const [, , vw, vh] = n.viewBox.split(/\s+/).map(Number);
    const sx = vw ? n.width / vw : 1;
    const sy = vh ? n.height / vh : 1;
    out.push({ id, parentId: n.parentId, x: n.x, y: n.y, points: scalePoints(n.penPoints, sx, sy), closed: !!n.penClosed });
  }
  return out;
}

function write(doc: DesignDoc, id: string, x: number, y: number, points: PenPoint[], closed: boolean): boolean {
  const geo = penGeometry(points, closed);
  if (!geo) return false;
  doc.setVectorPath(id, {
    x: x + geo.box.x,
    y: y + geo.box.y,
    width: geo.box.width,
    height: geo.box.height,
    viewBox: geo.viewBox,
    markup: geo.markup,
    penPoints: translatePoints(points, -geo.box.x, -geo.box.y),
    penClosed: closed,
  });
  return true;
}

const NONE = "Select a path drawn with the Pen or Pencil tool (not rotated or flipped)";

/** Figma's Simplify: fewer points, same shape. Returns how many layers changed. */
export function simplifySelection(doc: DesignDoc, ids: string[]): { count: number; error?: string } {
  const layers = penLayers(doc, ids);
  if (!layers.length) return { count: 0, error: NONE };
  doc.stopCapturing();
  let count = 0;
  for (const l of layers) {
    const next = simplifyPenPoints(l.points, l.closed);
    if (next.length < l.points.length && write(doc, l.id, l.x, l.y, next, l.closed)) count++;
  }
  doc.stopCapturing();
  return count ? { count } : { count, error: "Nothing to simplify" };
}

/** Make every point of the selected paths smooth. */
export function smoothSelection(doc: DesignDoc, ids: string[]): { count: number; error?: string } {
  const layers = penLayers(doc, ids);
  if (!layers.length) return { count: 0, error: NONE };
  doc.stopCapturing();
  let count = 0;
  for (const l of layers) if (write(doc, l.id, l.x, l.y, smoothPenPoints(l.points, l.closed), l.closed)) count++;
  doc.stopCapturing();
  return { count };
}

/** Figma's Join: close a single open path, or merge two open paths of the same parent at their nearest ends. */
export function joinSelection(doc: DesignDoc, ids: string[]): { ids: string[]; error?: string } {
  const layers = penLayers(doc, ids).filter((l) => !l.closed);
  if (layers.length === 1) {
    const l = layers[0]!;
    if (l.points.length < 3) return { ids, error: "A path needs at least three points to be closed" };
    doc.stopCapturing();
    write(doc, l.id, l.x, l.y, l.points, true);
    doc.stopCapturing();
    return { ids: [l.id] };
  }
  if (layers.length === 2 && layers[0]!.parentId === layers[1]!.parentId) {
    const [a, b] = layers as [PenLayer, PenLayer];
    const shift = (l: PenLayer) => translatePoints(l.points, l.x - a.x, l.y - a.y);
    doc.stopCapturing();
    const ok = write(doc, a.id, a.x, a.y, joinPenPaths(shift(a), shift(b)), false);
    if (ok) doc.deleteNode(b.id);
    doc.stopCapturing();
    return { ids: [a.id] };
  }
  return { ids, error: "Select one open path to close it, or two open paths in the same frame to join them" };
}

/** Figma's Delete and heal: remove one point of a pen path; its neighbours stay joined, so the path stays whole. */
export function deletePointAndHeal(doc: DesignDoc, id: string, index: number): boolean {
  const l = penLayers(doc, [id])[0];
  if (!l || index < 0 || index >= l.points.length || l.points.length <= 2) return false;
  doc.stopCapturing();
  const ok = write(doc, l.id, l.x, l.y, l.points.filter((_, i) => i !== index), l.closed);
  doc.stopCapturing();
  return ok;
}

/** Figma's Split vector: cut a pen path at one point. Returns the layers that make up the result (the original, plus a new one for the second piece). */
export function splitVectorAt(doc: DesignDoc, id: string, index: number): string[] | null {
  const l = penLayers(doc, [id])[0];
  const node = doc.getNode(id);
  if (!l || !node || node.type !== "VECTOR") return null;
  const pieces = splitPenPoints(l.points, l.closed, index);
  if (!pieces) return null;
  const order = doc.children(l.parentId).map((n) => n.id);
  doc.stopCapturing();
  write(doc, id, l.x, l.y, pieces[0]!, false);
  const ids = [id];
  if (pieces[1]) {
    const geo = penGeometry(pieces[1], false)!;
    const props = {
      name: node.name,
      x: l.x + geo.box.x,
      y: l.y + geo.box.y,
      width: geo.box.width,
      height: geo.box.height,
      viewBox: geo.viewBox,
      markup: geo.markup,
      penPoints: translatePoints(pieces[1], -geo.box.x, -geo.box.y),
      penClosed: false,
      fills: [],
      strokes: (node as unknown as { strokes?: unknown[] }).strokes ?? [],
      strokeWidth: (node as unknown as { strokeWidth?: number }).strokeWidth ?? 1,
    };
    ids.push(doc.createNode("VECTOR", { parentId: l.parentId, index: order.indexOf(id) + 1, props: props as never }));
  }
  doc.stopCapturing();
  return ids;
}
