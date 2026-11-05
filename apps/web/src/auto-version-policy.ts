/** How long a file has to stay changed (and quiet) before an automatic version is saved. */
export const AUTO_VERSION_MS = 10 * 60 * 1000;

export interface AutoVersionState {
  /** The document `version` counter when we last looked, and when an automatic version was last saved. */
  lastSeenVersion: number;
  lastSavedVersion: number;
  lastSavedAt: number;
}

/**
 * An automatic version is due when the document changed since the last one (or since the file opened) and at least
 * `interval` has passed since the last one. Opening a file and not touching it never saves anything.
 */
export function autoVersionDue(state: AutoVersionState, version: number, now: number, interval = AUTO_VERSION_MS): boolean {
  return version !== state.lastSavedVersion && now - state.lastSavedAt >= interval;
}

/** Name an automatic version after its time, e.g. "Autosave · Nov 5, 02:10 AM". */
export function autoVersionName(now: number): string {
  const stamp = new Date(now).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return `Autosave · ${stamp}`;
}
