/**
 * Figma's "Duplicate and repeat last move": after you drag a copy away with Alt, Ctrl+D copies the layers again by the
 * same distance (handy for rows and grids). Any other selection starts over with the plain offset.
 */
import type { DesignDoc } from "@farsha/design-core";
import { unionBox } from "@farsha/canvas-engine";
import type { Box } from "@farsha/types";

export interface Offset {
  x: number;
  y: number;
}

let last: { ids: string[]; offset: Offset } | null = null;

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** Remember how far the copies of an Alt+drag were moved. A zero move forgets the last one. */
export function rememberCopyMove(ids: string[], offset: Offset): void {
  last = ids.length && (offset.x !== 0 || offset.y !== 0) ? { ids: [...ids], offset } : null;
}

/** Gap between a top-level frame and its copy (Figma puts the copy to the right of the original). */
export const FRAME_GAP = 100;

/** When every layer is a frame lying directly on the page, the move that puts the copies right of the originals; otherwise null. */
export function frameCopyOffset(doc: DesignDoc, ids: string[], gap = FRAME_GAP): Offset | null {
  if (!ids.length) return null;
  for (const id of ids) {
    const n = doc.getNode(id);
    if (n?.type !== "FRAME" || doc.getNode(n.parentId ?? "")?.type !== "PAGE") return null;
  }
  const box = unionBox(ids.map((id) => doc.absoluteBox(id)).filter((b): b is Box => !!b));
  return box ? { x: Math.round(box.width + gap), y: 0 } : null;
}

/** The offset for Ctrl+D on these layers: the remembered move when they are the copies it made, the move to the right for frames on the page, else the plain one. */
export function duplicateOffset(ids: string[], plain = 10, doc?: DesignDoc): Offset {
  if (last && sameSet(last.ids, ids)) return last.offset;
  return (doc && frameCopyOffset(doc, ids)) || { x: plain, y: plain };
}

/** After Ctrl+D: the copies carry on the same repeat. */
export function afterDuplicate(from: string[], copies: string[], used: Offset): void {
  if (last && sameSet(last.ids, from) && copies.length) last = { ids: [...copies], offset: used };
}

/** For tests. */
export function forgetCopyMove(): void {
  last = null;
}
