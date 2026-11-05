/**
 * The name of a duplicate when "Rename duplicated layers" is on: a trailing number goes up by one
 * ("Card 1" becomes "Card 2", "Frame 12" becomes "Frame 13"). A name without a trailing number stays as it is.
 */
export function nextCopyName(name: string): string {
  const m = /^(.*?)(\d+)$/.exec(name);
  if (!m) return name;
  return `${m[1]}${Number(m[2]) + 1}`;
}
