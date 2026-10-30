export interface CommandInfo {
  label: string;
  keywords?: string;
}

/** Commands matching every word of the query (in the label or keywords), best matches first: label start, then word start, then anywhere. */
export function filterCommands<T extends CommandInfo>(commands: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return commands;
  const scored: { c: T; score: number; i: number }[] = [];
  commands.forEach((c, i) => {
    const label = c.label.toLowerCase();
    const hay = `${label} ${(c.keywords ?? "").toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) return;
    const score = words.reduce((s, w) => s + (label.startsWith(w) ? 0 : label.includes(` ${w}`) ? 1 : 2), 0);
    scored.push({ c, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((s) => s.c);
}
