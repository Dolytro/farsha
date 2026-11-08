/**
 * Dragging a layer inside an auto layout frame reorders it: how many of the other layers (in layout order) sit before the pointer,
 * counted by the middle of each along the layout direction.
 */
export function insertionIndex(otherCentres: number[], pointer: number): number {
  let index = 0;
  for (const c of otherCentres) if (c < pointer) index++;
  return index;
}

/**
 * Where to move a dragged layer so it lands before the `slot`-th other layer (or at the end). `order` is the ids of all the children of the frame
 * in layer order, `others` the ids of the layers that take part in the layout (the dragged one left out). Returns the index to give to the
 * layer, counted among the children without it, or null when it already sits there.
 */
export function reorderTarget(order: string[], dragged: string, others: string[], slot: number): number | null {
  const without = order.filter((id) => id !== dragged);
  const before = others[slot];
  const target = before === undefined ? without.length : without.indexOf(before);
  if (target < 0) return null;
  const current = order.indexOf(dragged);
  return target === current ? null : target;
}
