/** The part of a long list worth drawing: the rows in view plus a few either side, and the height of the empty space above and below. */
export interface RowWindow {
  start: number;
  end: number;
  before: number;
  after: number;
}

export function rowWindow(count: number, rowHeight: number, scrollTop: number, viewHeight: number, overscan = 10): RowWindow {
  const h = rowHeight > 0 ? rowHeight : 24;
  const total = Math.max(0, count);
  const first = Math.max(0, Math.floor(Math.max(0, scrollTop) / h) - overscan);
  const last = Math.min(total, Math.ceil((Math.max(0, scrollTop) + Math.max(0, viewHeight)) / h) + overscan);
  const start = Math.min(first, total);
  const end = Math.max(start, last);
  return { start, end, before: start * h, after: (total - end) * h };
}

/** The scroll position that brings row `index` into view with the least movement (unchanged when it is already visible). */
export function scrollToRow(index: number, rowHeight: number, scrollTop: number, viewHeight: number): number {
  const top = index * rowHeight;
  const bottom = top + rowHeight;
  if (top < scrollTop) return top;
  if (bottom > scrollTop + viewHeight) return Math.max(0, bottom - viewHeight);
  return scrollTop;
}
