const OPENERS = /[\s([{<—–‘“-]/;

/**
 * Figma's "Use smart quotes": when one straight quote was just typed at `caret`, swap it for the curly one.
 * The quote opens (“ ‘) at the start, after a space or an opening bracket or dash, and closes (” ’) after anything else.
 * Returns `next` untouched when the edit was not a single typed " or '.
 */
export function smartQuote(prev: string, next: string, caret: number): string {
  if (next.length !== prev.length + 1 || caret < 1) return next;
  const typed = next[caret - 1];
  if (typed !== '"' && typed !== "'") return next;
  if (next.slice(0, caret - 1) + next.slice(caret) !== prev) return next;
  const before = caret >= 2 ? next[caret - 2]! : "";
  const opening = before === "" || OPENERS.test(before);
  const curly = typed === '"' ? (opening ? "“" : "”") : opening ? "‘" : "’";
  return next.slice(0, caret - 1) + curly + next.slice(caret);
}
