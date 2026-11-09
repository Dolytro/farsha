/**
 * Figma's "Duplicate and repeat last move": after you drag a copy away with Alt, Ctrl+D copies the layers again by the
 * same distance (handy for rows and grids). Any other selection starts over with the plain offset.
 */
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

/** The offset for Ctrl+D on these layers: the remembered move when they are the copies it made, else the plain one. */
export function duplicateOffset(ids: string[], plain = 10): Offset {
  return last && sameSet(last.ids, ids) ? last.offset : { x: plain, y: plain };
}

/** After Ctrl+D: the copies carry on the same repeat. */
export function afterDuplicate(from: string[], copies: string[], used: Offset): void {
  if (last && sameSet(last.ids, from) && copies.length) last = { ids: [...copies], offset: used };
}

/** For tests. */
export function forgetCopyMove(): void {
  last = null;
}
