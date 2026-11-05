/** Actions you ran lately, newest first, so the palette (Ctrl+/) can offer them before you type anything. */
export const RECENT_KEY = "farsha.recentActions";
export const RECENT_MAX = 5;

/** Read the saved list; anything that is not a list of strings gives an empty list. */
export function parseRecent(text: string | null | undefined): string[] {
  try {
    const parsed: unknown = text ? JSON.parse(text) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** Put `id` first (moving it up if it was already there) and keep at most RECENT_MAX. */
export function pushRecent(list: string[], id: string): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, RECENT_MAX);
}

/** Split commands into the recent ones (newest first, only those still available) and the rest (order kept). */
export function splitRecent<T extends { id: string }>(commands: T[], recentIds: string[]): { recent: T[]; rest: T[] } {
  const byId = new Map(commands.map((c) => [c.id, c]));
  const recent = recentIds.map((id) => byId.get(id)).filter((c): c is T => !!c);
  const taken = new Set(recent.map((c) => c.id));
  return { recent, rest: commands.filter((c) => !taken.has(c.id)) };
}

export function loadRecent(): string[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

export function saveRecent(list: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage can be blocked; the list just is not kept */
  }
}
